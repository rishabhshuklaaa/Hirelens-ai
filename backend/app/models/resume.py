import enum
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum, func, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class ResumeStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    AUTO_ADDED = "AUTO_ADDED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    ADDED_BY_RECRUITER = "ADDED_BY_RECRUITER"
    UNREADABLE = "UNREADABLE"
    DUPLICATE_SKIPPED = "DUPLICATE_SKIPPED"

class AIStatus(str, enum.Enum):
    PENDING_AI = "PENDING_AI"
    AI_SCORED = "AI_SCORED"
    AI_FAILED = "AI_FAILED"

# Removed spaces from enum values to prevent SQLAlchemy/DB mismatch
class AITierDecision(str, enum.Enum):
    STRONG_FIT = "STRONG_FIT"
    MAYBE = "MAYBE"
    NO = "NO"

class RecruiterDecision(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    page_count = Column(Integer, nullable=True)
    
    content_hash = Column(String(64), index=True, nullable=True) 
    extracted_text = Column(Text, nullable=True)
    cleaned_text = Column(Text, nullable=True)
    candidate_email = Column(String(255), nullable=True)
    
    # Phase 2 fields
    quick_score = Column(Float, nullable=True)
    status = Column(Enum(ResumeStatus), default=ResumeStatus.UPLOADED, nullable=False)
    unreadable_reason = Column(String(255), nullable=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ---------------- Phase 3 AI Fields ----------------
    ai_status = Column(Enum(AIStatus), default=AIStatus.PENDING_AI, nullable=False)
    
    # Overall score computed by backend, not LLM
    ai_overall_score = Column(Float, nullable=True)
    ai_tier_decision = Column(Enum(AITierDecision), nullable=True)
    
    # Structured JSON for vectors: {tech_depth: 80, project_impact: 60, career_trajectory: 75, resume_quality: 90, risk_score: 20}
    ai_vector_scores = Column(JSON, nullable=True)
    
    # Explainability
    ai_score_justification = Column(Text, nullable=True)
    ai_strong_points = Column(JSON, nullable=True) 
    ai_missing_skills = Column(JSON, nullable=True) 
    ai_red_flags = Column(JSON, nullable=True) # FIX: Added missing column for red flags list
    
    # Auditability & Idempotency
    ai_raw_response = Column(JSON, nullable=True)
    prompt_version = Column(String(50), nullable=True)
    scored_at = Column(DateTime(timezone=True), nullable=True)
    
    # Recruiter Action
    recruiter_decision = Column(Enum(RecruiterDecision), default=RecruiterDecision.PENDING, nullable=False)
    
    # Relationship
    batch = relationship("Batch", back_populates="resumes")