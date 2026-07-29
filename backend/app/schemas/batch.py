from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.resume import ResumeStatus, AIStatus, AITierDecision, RecruiterDecision
from app.models.resume import ResumeStatus

class ResumeResponse(BaseModel):
    id: int
    original_filename: str
    file_size_bytes: int
    page_count: int | None = None
    candidate_email: str | None = None
    quick_score: float | None = None
    status: ResumeStatus
    unreadable_reason: str | None = None

    # Phase 3 AI Fields
    ai_status: AIStatus
    ai_overall_score: float | None = None
    ai_tier_decision: AITierDecision | None = None
    ai_vector_scores: dict | None = None
    ai_score_justification: str | None = None
    ai_strong_points: list[str] | None = None
    ai_missing_skills: list[str] | None = None
    ai_red_flags: list[str] | None = None
    recruiter_decision: RecruiterDecision

    model_config = ConfigDict(from_attributes=True)

class BatchUploadResponse(BaseModel):
    batch_id: int
    total_files: int
    message: str

class BatchProgressResponse(BaseModel):
    batch_id: int
    status: str
    resumes: list[ResumeResponse]

class ResumeStatusUpdate(BaseModel):
    status: ResumeStatus