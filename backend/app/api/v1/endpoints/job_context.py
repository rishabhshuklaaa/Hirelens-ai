from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.job_context import JobContext
from app.schemas.job_context import JobContextCreate, JobContextResponse

router = APIRouter(prefix="/job-context", tags=["Job Context"])

@router.post("/", response_model=JobContextResponse, status_code=status.HTTP_201_CREATED)
def create_job_context(
    context_data: JobContextCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    new_context = JobContext(
        user_id=current_user.id,
        company_name=context_data.company_name,
        company_sector=context_data.company_sector,
        job_title=context_data.job_title, 
        jd_text=context_data.jd_text
    )
    db.add(new_context)
    db.commit()
    db.refresh(new_context)
    return new_context

# FIX: Removed is_active filter, fetch all contexts
@router.get("/", response_model=list[JobContextResponse])
def get_my_job_contexts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contexts = db.query(JobContext).filter(
        JobContext.user_id == current_user.id
    ).order_by(JobContext.created_at.desc()).all()
    return contexts

# FIX: Hard Delete from DB
@router.delete("/{context_id}", status_code=status.HTTP_200_OK)
def delete_job_context(
    context_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    context = db.query(JobContext).filter(JobContext.id == context_id, JobContext.user_id == current_user.id).first()
    if not context:
        raise HTTPException(status_code=404, detail="Job Context not found")
        
    db.delete(context)
    db.commit()
    return {"message": "Job Context deleted successfully"}