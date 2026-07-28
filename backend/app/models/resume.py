import enum
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from app.core.database import Base

# Enum for Resume Status
class ResumeStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    AUTO_ADDED = "AUTO_ADDED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    ADDED_BY_RECRUITER = "ADDED_BY_RECRUITER"
    UNREADABLE = "UNREADABLE"
    DUPLICATE_SKIPPED = "DUPLICATE_SKIPPED"

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    page_count = Column(Integer, nullable=True)
    
    # PostgreSQL allows multiple NULLs in a unique column, so unreadable PDFs won't break this
    content_hash = Column(String(64), index=True, nullable=True) 
    
    extracted_text = Column(Text, nullable=True)
    cleaned_text = Column(Text, nullable=True)
    candidate_email = Column(String(255), nullable=True)
    
    quick_score = Column(Float, nullable=True)
    status = Column(Enum(ResumeStatus), default=ResumeStatus.UPLOADED, nullable=False)
    
    # New field added: Reason why it was marked UNREADABLE
    unreadable_reason = Column(String(255), nullable=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    batch = relationship("Batch", back_populates="resumes")