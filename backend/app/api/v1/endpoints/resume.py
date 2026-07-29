import os
from fastapi import Response
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.resume import Resume, ResumeStatus
from app.schemas.batch import ResumeResponse, ResumeStatusUpdate
from app.models.resume import RecruiterDecision
from pydantic import BaseModel

router = APIRouter(prefix="/resume", tags=["Resume Actions"])

class RecruiterDecisionUpdate(BaseModel):
    decision: RecruiterDecision

@router.get("/all", response_model=list[ResumeResponse])
def get_all_user_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch all resumes for the current recruiter."""
    resumes = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        #  Filter out resumes that got stuck in UPLOADED state due to server restarts
        Resume.status != ResumeStatus.UPLOADED 
    ).order_by(Resume.created_at.desc()).all()
    return resumes


@router.patch("/{resume_id}", response_model=ResumeResponse)
def update_resume_status(
    resume_id: int,
    update_data: ResumeStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Override resume status (e.g., add to processing pipeline manually)."""
    
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this resume")
        
    # Update logic: Recruiter can only override to ADDED_BY_RECRUITER
    if update_data.status != ResumeStatus.ADDED_BY_RECRUITER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recruiters can only manually ADD resumes.")
        
    # EDGE CASE FIX: Do not allow UNREADABLE or DUPLICATE_SKIPPED resumes to be added
    # because they don't have valid extracted text for the Deep AI Engine.
    if resume.status in [ResumeStatus.UNREADABLE, ResumeStatus.DUPLICATE_SKIPPED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Cannot add resume with status {resume.status.value}. No valid text available for AI analysis."
        )
        
    resume.status = update_data.status
    db.commit()
    db.refresh(resume)
    
    return resume

@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume_details(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch full details of a specific resume."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this resume")
        
    return resume

@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a resume from DB and disk."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this resume")
        
    # Remove physical file from disk
    if os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except Exception as e:
            # Log the error but don't block DB deletion
            print(f"Error deleting file {resume.file_path}: {e}")
            
    # Delete from DB
    db.delete(resume)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Added endpoint to allow recruiters to approve/reject resumes after AI scoring
@router.patch("/{resume_id}/decision", response_model=ResumeResponse)
def update_recruiter_decision(
    resume_id: int,
    update_data: RecruiterDecisionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve or Reject a resume by the recruiter."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
    resume.recruiter_decision = update_data.decision
    db.commit()
    db.refresh(resume)
    return resume