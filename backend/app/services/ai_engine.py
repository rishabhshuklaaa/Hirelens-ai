import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from langchain_groq import ChatGroq
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.exceptions import OutputParserException

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.resume import Resume, AIStatus, AITierDecision
from app.schemas.audit import AIAnalysisSchema
from app.ai.prompts.audit_prompt import get_audit_prompt

logger = logging.getLogger(__name__)

# Weighted formula for the final score (must total 1.0)
WEIGHTS = {
    "tech_depth_score": 0.35,
    "project_impact_score": 0.35,
    "career_trajectory_score": 0.15,
    "resume_quality_score": 0.15,
}

# Cap resume text length to keep token usage low (helps Groq free-tier TPM limit).
# ~8000 chars is roughly 2000 tokens, enough for a full resume.
MAX_RESUME_CHARS = 8000

parser = PydanticOutputParser(pydantic_object=AIAnalysisSchema)


class RateLimitHit(Exception):
    """Raised when Groq's rate limit is hit. This is TRANSIENT (not a real failure),
    so the caller should wait and retry the SAME resume instead of marking it failed."""

    def __init__(self, retry_after: float = 25.0):
        self.retry_after = retry_after
        super().__init__(f"Rate limit hit, retry after {retry_after}s")


def _is_rate_limit(exc: Exception) -> bool:
    """Detect a Groq rate-limit error from the exception message/status."""
    msg = str(exc).lower()
    return "rate limit" in msg or "rate_limit" in msg or "429" in msg


def calculate_overall_score_and_tier(ai_data: AIAnalysisSchema) -> tuple[float, AITierDecision]:
    """Compute the weighted overall score and the 3-tier decision in the backend
    (single source of truth — the LLM does NOT decide these)."""
    overall = (
        (ai_data.tech_depth_score * WEIGHTS["tech_depth_score"])
        + (ai_data.project_impact_score * WEIGHTS["project_impact_score"])
        + (ai_data.career_trajectory_score * WEIGHTS["career_trajectory_score"])
        + (ai_data.resume_quality_score * WEIGHTS["resume_quality_score"])
    )

    # Apply a penalty when risk is high
    if ai_data.risk_score >= 50:
        overall -= ai_data.risk_score * 0.2

    overall = max(0.0, min(100.0, round(overall, 2)))  # clamp 0-100

    if overall >= 70 and ai_data.risk_score < 40:
        tier = AITierDecision.STRONG_FIT
    elif overall >= 50 and ai_data.risk_score < 60:
        tier = AITierDecision.MAYBE
    else:
        tier = AITierDecision.NO

    return overall, tier


def run_ai_audit_for_resume(resume_id: int):
    """Score a single resume with the Deep AI engine.

    Raises RateLimitHit (transient) so the caller can wait and retry without
    marking the resume as failed. Any other error marks the resume AI_FAILED.
    """
    db: Session = SessionLocal()

    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            logger.error(f"Resume {resume_id} not found.")
            return
        if not resume.cleaned_text:
            logger.error(f"Resume {resume_id} has no cleaned text — marking failed.")
            resume.ai_status = AIStatus.AI_FAILED
            db.commit()
            return

        job_context = resume.batch.job_context
        if not job_context:
            logger.error(f"Job context missing for batch {resume.batch_id}")
            resume.ai_status = AIStatus.AI_FAILED
            db.commit()
            return

        # Idempotency: skip if already scored
        if resume.ai_status == AIStatus.AI_SCORED and resume.scored_at is not None:
            logger.info(f"Resume {resume_id} already scored. Skipping.")
            return

        # Truncate long resumes to stay under token limits
        resume_text = resume.cleaned_text[:MAX_RESUME_CHARS]

        prompt = get_audit_prompt(job_context.company_sector, job_context.jd_text, resume_text)
        format_instructions = parser.get_format_instructions()
        formatted_prompt = prompt.format_messages(format_instructions=format_instructions)

        # Init the LLM client. temperature=0 for consistent analytical scoring.
        # max_retries=0 because we handle retries manually below.
        llm = ChatGroq(
            temperature=0,
            groq_api_key=settings.GROQ_API_KEY,
            model_name="llama-3.1-8b-instant",
            timeout=30,
            max_retries=0,
        )

        response = None
        ai_response = None
        max_retries = 3

        for attempt in range(max_retries):
            try:
                response = llm.invoke(formatted_prompt)
                ai_response = parser.parse(response.content)
                break  # success
            except OutputParserException as e:
                # Bad JSON — retry a couple times, then fail
                logger.warning(f"Attempt {attempt+1}: JSON parse failed for resume {resume_id}: {e}")
                if attempt == max_retries - 1:
                    raise
            except Exception as e:
                # Rate limit is transient — propagate so the caller waits & retries
                if _is_rate_limit(e):
                    logger.warning(f"Rate limit hit while scoring resume {resume_id}.")
                    raise RateLimitHit()
                logger.warning(f"Attempt {attempt+1}: LLM call failed for resume {resume_id}: {e}")
                if attempt == max_retries - 1:
                    raise

        if not ai_response or not response:
            raise Exception("LLM failed to return a valid response after retries.")

        overall_score, tier_decision = calculate_overall_score_and_tier(ai_response)

        resume.ai_overall_score = overall_score
        resume.ai_tier_decision = tier_decision
        resume.ai_vector_scores = {
            "tech_depth": ai_response.tech_depth_score,
            "project_impact": ai_response.project_impact_score,
            "career_trajectory": ai_response.career_trajectory_score,
            "resume_quality": ai_response.resume_quality_score,
            "risk_score": ai_response.risk_score,
        }
        resume.ai_score_justification = ai_response.score_justification
        resume.ai_strong_points = ai_response.strong_points
        resume.ai_missing_skills = ai_response.missing_skills
        resume.ai_red_flags = ai_response.red_flags_identified
        resume.ai_raw_response = (
            response.content if isinstance(response.content, str) else response.content.decode()
        )
        resume.prompt_version = "v1.0"
        resume.scored_at = datetime.now(timezone.utc)
        resume.ai_status = AIStatus.AI_SCORED  # only mark scored on full success
        db.commit()
        logger.info(f"Resume {resume_id} scored. Overall: {overall_score}, Tier: {tier_decision}")

    except RateLimitHit:
        # Transient — leave the resume as PENDING_AI so the UI keeps showing
        # "analyzing" (not "failed"). The caller will wait and retry.
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"AI audit failed for resume {resume_id}: {e}")
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if resume:
            resume.ai_status = AIStatus.AI_FAILED
            db.commit()
    finally:
        db.close()