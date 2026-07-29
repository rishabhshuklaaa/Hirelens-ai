from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    candidate_email = Column(String(255), nullable=False)
    email_type = Column(String(50), nullable=False) # offer, assessment, interview, rejection
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    resume = relationship("Resume")