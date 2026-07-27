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
    """Save the Job Context (Company, Sector, JD) for the logged-in recruiter."""
    # Check if user already has a context 
    existing_context = db.query(JobContext).filter(JobContext.user_id == current_user.id).first()
    if existing_context:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job context already exists. Use update API.")
    
    new_context = JobContext(
        user_id=current_user.id,
        company_name=context_data.company_name,
        company_sector=context_data.company_sector,
        jd_text=context_data.jd_text
    )
    db.add(new_context)
    db.commit()
    db.refresh(new_context)
    return new_context

@router.get("/", response_model=JobContextResponse)
def get_my_job_context(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch the saved Job Context for the current recruiter."""
    context = db.query(JobContext).filter(JobContext.user_id == current_user.id).first()
    if not context:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No job context found. Please create one.")
    return context