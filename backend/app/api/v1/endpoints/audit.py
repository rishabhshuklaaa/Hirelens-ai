import time
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.core.database import get_db,SessionLocal          
from app.api.deps import get_current_user
from app.models.user import User
from app.models.batch import Batch
from app.models.resume import Resume, ResumeStatus, AIStatus
from app.schemas.batch import ResumeResponse
from app.services.ai_engine import run_ai_audit_for_resume,RateLimitHit
from app.models.resume import Resume, AIStatus   

router = APIRouter(prefix="/audit", tags=["AI Audit"])
logger = logging.getLogger(__name__)

THROTTLE_SECONDS = 2
MAX_RATE_LIMIT_RETRIES = 5

@router.post("/batch/{batch_id}/run-audit", status_code=status.HTTP_202_ACCEPTED)
def trigger_ai_audit(
    batch_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers Deep AI Audit for eligible resumes in a batch.
    Review-only (NEEDS_REVIEW) resumes ko SKIP karta hai — sirf added wale audit hote hain.
    """
    # Verify batch ownership
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.user_id == current_user.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Only  "added" resumes eligible
    eligible_statuses = [ResumeStatus.AUTO_ADDED, ResumeStatus.ADDED_BY_RECRUITER]

    # Include resumes that are either pending AI or previously failed AI (to allow re-audit)
    auditable_ai_statuses = [AIStatus.PENDING_AI, AIStatus.AI_FAILED]

    resumes_to_audit = db.query(Resume).filter(
        Resume.batch_id == batch_id,
        Resume.status.in_(eligible_statuses),
        Resume.ai_status.in_(auditable_ai_statuses)
    ).all()

    if not resumes_to_audit:
        raise HTTPException(
            status_code=400,
            detail="No eligible resumes for AI audit. (Review-only resumes are skipped, scored ones are already done.)"
        )

    # Extract resume IDs for sequential processing
    resume_ids = [r.id for r in resumes_to_audit]

    # background task in sequential mode
    background_tasks.add_task(_run_audit_sequentially, resume_ids)

    return {
        "message": f"AI Audit started for {len(resume_ids)} resumes.",
        "total_resumes": len(resume_ids),
    }


@router.get("/batch/{batch_id}/results", response_model=list[ResumeResponse])
def get_audit_results(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches AI audit results for a batch, sorted by AI score (Leaderboard)."""
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.user_id == current_user.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    resumes = db.query(Resume).filter(
        Resume.batch_id == batch_id
    ).order_by(
        Resume.ai_overall_score.desc().nullslast()
    ).all()

    return resumes


def _mark_failed(resume_id: int):
    """Mark a resume AI_FAILED (used only when rate-limit retries are exhausted)."""
    db = SessionLocal() 
    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if resume:
            resume.ai_status = AIStatus.AI_FAILED
            db.commit()
    finally:
        db.close()


def _run_audit_sequentially(resume_ids: list[int]):
    """Process resumes ONE AT A TIME.

    - On a rate limit, wait and retry the SAME resume (it stays 'analyzing',
      never shows 'failed') so the UI never looks crashed.
    - Only a genuine error (or exhausting all rate-limit retries) marks a
      resume as failed.
    """
    for rid in resume_ids:
        for rl_attempt in range(MAX_RATE_LIMIT_RETRIES):
            try:
                run_ai_audit_for_resume(rid)
                break  # finished (scored, or genuinely failed inside)
            except RateLimitHit as e:
                logger.warning(
                    f"Rate limit on resume {rid}. Waiting {e.retry_after}s "
                    f"(retry {rl_attempt + 1}/{MAX_RATE_LIMIT_RETRIES})."
                )
                time.sleep(e.retry_after)
        else:
            # All rate-limit retries used up — fail this one so it doesn't hang forever
            logger.error(f"Resume {rid} still rate-limited after retries. Marking failed.")
            _mark_failed(rid)

        time.sleep(THROTTLE_SECONDS)  # gentle pacing between resumes