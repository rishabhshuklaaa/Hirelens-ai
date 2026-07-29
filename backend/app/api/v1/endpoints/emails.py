from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.models.email_log import EmailLog
from app.schemas.email import EmailGenerateRequest, EmailContent, EmailSendRequest
from app.services.email_ai_service import generate_email_content
from app.services.email_sender import send_email

router = APIRouter(prefix="/email", tags=["Email Generation"])

@router.post("/generate", response_model=EmailContent)
def generate_email_api(
    request: EmailGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate an AI email draft based on resume context and email type."""
    
    resume = db.query(Resume).filter(Resume.id == request.resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        
    job_context = resume.batch.job_context
    if not job_context:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job context missing")
        
    candidate_name = "Candidate" 
    
    try:
        email_content = generate_email_content(
            email_type=request.email_type,
            candidate_name=candidate_name,
            job_title=job_context.job_title,
            company_name=job_context.company_name,
            strong_points=resume.ai_strong_points or [],
            missing_skills=resume.ai_missing_skills or []
        )
        return email_content
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/send", status_code=status.HTTP_200_OK)
def send_email_api(
    request: EmailSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sends the actual email and logs it to the database."""
    
    resume = db.query(Resume).filter(Resume.id == request.resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        
    # SECURITY FIX: Derive recipient from DB, do not trust client's request body
    to_email = resume.candidate_email
    if not to_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate email is missing in DB. Cannot send.")
        
    try:
        # 1. Send Email via SMTP
        send_email(to_email, request.subject, request.body)
        
        # 2. Log to Database
        new_log = EmailLog(
            resume_id=request.resume_id,
            user_id=current_user.id,
            candidate_email=to_email,
            email_type=request.email_type,
            subject=request.subject,
            body=request.body
        )
        db.add(new_log)
        db.commit()
        
        return {"message": "Email sent successfully!", "log_id": new_log.id}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))