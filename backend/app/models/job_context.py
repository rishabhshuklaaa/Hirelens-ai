from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class JobContext(Base):
    __tablename__ = "job_contexts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    company_name = Column(String(255), nullable=False)
    company_sector = Column(String(100), nullable=False) # e.g., Tech, FinTech, Healthcare
    jd_text = Column(Text, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship with User
    owner = relationship("User", back_populates="job_contexts")