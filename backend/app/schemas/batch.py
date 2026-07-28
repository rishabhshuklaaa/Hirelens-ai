from pydantic import BaseModel, ConfigDict
from datetime import datetime
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