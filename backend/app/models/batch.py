from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_context_id = Column(Integer, ForeignKey("job_contexts.id", ondelete="SET NULL"), nullable=True)
    
    total_files = Column(Integer, nullable=False, default=0)
    status = Column(String(50), default="processing") # e.g., processing, completed, failed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    job_context = relationship("JobContext")
    resumes = relationship("Resume", back_populates="batch", cascade="all, delete-orphan")