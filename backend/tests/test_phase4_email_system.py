import pytest
import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.job_context import JobContext
from app.models.batch import Batch
from app.models.resume import Resume, ResumeStatus, AIStatus, AITierDecision
from app.models.email_log import EmailLog
from app.core.security import get_password_hash

# Ensure test DB tables exist
Base.metadata.create_all(bind=engine)

# ==========================================
# FIXTURES
# ==========================================

@pytest.fixture(scope="function")
def auth_client_with_email_resume():
    """Creates a user, job context, and a resume with a candidate_email."""
    db = SessionLocal()
    email = f"test_{uuid.uuid4().hex[:8]}@hirelens.com"
    user = User(email=email, hashed_password=get_password_hash("StrongPass123"))
    db.add(user)
    db.commit()
    db.refresh(user)
    
    job_context = JobContext(
        user_id=user.id, company_name="Test Corp", company_sector="Tech", 
        job_title="Backend Dev", jd_text="Need Python developer"
    )
    db.add(job_context)
    db.commit()
    db.refresh(job_context)
    
    batch = Batch(user_id=user.id, job_context_id=job_context.id, total_files=1, status="completed")
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    resume = Resume(
        batch_id=batch.id, user_id=user.id,
        original_filename="test.pdf", file_path="uploads/test.pdf", file_size_bytes=1024,
        status=ResumeStatus.AUTO_ADDED, cleaned_text="Some text",
        candidate_email="candidate@example.com", 
        ai_status=AIStatus.AI_SCORED, ai_overall_score=85.0, ai_tier_decision=AITierDecision.STRONG_FIT,
        ai_strong_points=["Python"], ai_missing_skills=["AWS"]
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    
    from app.core.config import settings
    original_cookie_domain = settings.COOKIE_DOMAIN
    settings.COOKIE_DOMAIN = None
    
    with TestClient(app, base_url="http://localhost") as client:
        client.post("/api/v1/auth/login", json={"email": email, "password": "StrongPass123"})
        yield (client, resume.id, user.id)
        
    settings.COOKIE_DOMAIN = original_cookie_domain
    
    db.query(EmailLog).filter(EmailLog.user_id == user.id).delete()
    db.query(Resume).filter(Resume.user_id == user.id).delete()
    db.query(Batch).filter(Batch.user_id == user.id).delete()
    db.query(JobContext).filter(JobContext.id == job_context.id).delete()
    db.query(User).filter(User.id == user.id).delete()
    db.commit()
    db.close()

# ==========================================
# 1. AI EMAIL GENERATION TESTS
# ==========================================

def test_generate_email_success(auth_client_with_email_resume):
    """Test: AI generates a valid email draft."""
    client, resume_id, _ = auth_client_with_email_resume
    
    mock_json = '{"subject": "Offer Letter", "body": "Hi Candidate, you got the job!"}'
    mock_response = MagicMock()
    mock_response.content = mock_json
    
    with patch("app.services.email_ai_service.ChatGroq") as MockChatGroq:
        MockChatGroq.return_value.invoke.return_value = mock_response
        res = client.post("/api/v1/email/generate", json={"resume_id": resume_id, "email_type": "offer"})
        
        assert res.status_code == 200
        data = res.json()
        assert data["subject"] == "Offer Letter"

def test_generate_email_invalid_json(auth_client_with_email_resume):
    """Test: If LLM returns invalid JSON, endpoint should gracefully return 500."""
    client, resume_id, _ = auth_client_with_email_resume
    
    bad_response = MagicMock()
    bad_response.content = "Sorry, here is your email: ..." # Not a JSON
    
    with patch("app.services.email_ai_service.ChatGroq") as MockChatGroq:
        MockChatGroq.return_value.invoke.return_value = bad_response
        res = client.post("/api/v1/email/generate", json={"resume_id": resume_id, "email_type": "offer"})
        
        assert res.status_code == 500
        assert "AI failed to generate" in res.json()["detail"]

def test_generate_invalid_email_type(auth_client_with_email_resume):
    """Test: Invalid email_type should return 422 Unprocessable Entity."""
    client, resume_id, _ = auth_client_with_email_resume
    res = client.post("/api/v1/email/generate", json={"resume_id": resume_id, "email_type": "garbage"})
    assert res.status_code == 422

def test_generate_email_resume_not_found(auth_client_with_email_resume):
    """Test: Generating email for non-existent resume should return 404."""
    client, _, _ = auth_client_with_email_resume
    res = client.post("/api/v1/email/generate", json={"resume_id": 99999, "email_type": "offer"})
    assert res.status_code == 404

# ==========================================
# 2. EMAIL SENDING & LOGGING TESTS (Mocked SMTP)
# ==========================================

def test_send_email_success_and_logging(auth_client_with_email_resume):
    """Test: Sending email succeeds and creates an EmailLog in DB."""
    client, resume_id, user_id = auth_client_with_email_resume
    
    with patch("app.api.v1.endpoints.emails.send_email", return_value=True):
        res = client.post("/api/v1/email/send", json={
            "resume_id": resume_id,
            "subject": "Test Subject",
            "body": "Test Body",
            "email_type": "offer"
        })
        
        assert res.status_code == 200
        assert "log_id" in res.json()
        
        db = SessionLocal()
        log = db.query(EmailLog).filter(EmailLog.resume_id == resume_id).first()
        assert log is not None
        assert log.subject == "Test Subject"
        db.close()

def test_send_email_smtp_failure_no_log(auth_client_with_email_resume):
    """Test: If SMTP fails, return 500 and ensure NO log is saved in DB (Rollback)."""
    client, resume_id, _ = auth_client_with_email_resume
    
    with patch("app.api.v1.endpoints.emails.send_email", side_effect=Exception("SMTP down")):
        res = client.post("/api/v1/email/send", json={
            "resume_id": resume_id,
            "subject": "Fail Subject",
            "body": "Fail Body",
            "email_type": "offer"
        })
        
        assert res.status_code == 500
        
        db = SessionLocal()
        log = db.query(EmailLog).filter(EmailLog.resume_id == resume_id).first()
        assert log is None  # No log should be created on failure
        db.close()

def test_send_email_security_to_email_ignored(auth_client_with_email_resume):
    """Test: Backend should ignore any 'to_email' in request and use DB email."""
    client, resume_id, _ = auth_client_with_email_resume
    
    with patch("app.api.v1.endpoints.emails.send_email", return_value=True) as mock_send:
        res = client.post("/api/v1/email/send", json={
            "resume_id": resume_id,
            "subject": "Security Test",
            "body": "Body",
            "email_type": "offer",
            "to_email": "hacker@evil.com" 
        })
        
        assert res.status_code == 200
        # Verify send_email was called with DB email, not hacker email
        mock_send.assert_called_once_with("candidate@example.com", "Security Test", "Body")

def test_send_email_missing_candidate_email(auth_client_with_email_resume):
    """Test: If resume has no email, sending should fail with 400."""
    client, resume_id, _ = auth_client_with_email_resume
    
    db = SessionLocal()
    resume = db.get(Resume, resume_id)
    resume.candidate_email = None
    db.commit()
    db.close()
    
    with patch("app.api.v1.endpoints.emails.send_email", return_value=True):
        res = client.post("/api/v1/email/send", json={
            "resume_id": resume_id,
            "subject": "Test Subject",
            "body": "Test Body",
            "email_type": "offer"
        })
        
        assert res.status_code == 400
        assert "Candidate email is missing" in res.json()["detail"]

# ==========================================
# 3. OWNERSHIP ISOLATION
# ==========================================

def test_ownership_isolation_email_generation(auth_client_with_email_resume):
    """Test: User B cannot generate an email for User A's resume."""
    client_a, resume_id_a, user_a_id = auth_client_with_email_resume
    
    db = SessionLocal()
    email_b = f"test_{uuid.uuid4().hex[:8]}@hirelens.com"
    user_b = User(email=email_b, hashed_password=get_password_hash("Pass1234"))
    db.add(user_b)
    db.commit()
    db.refresh(user_b)
    db.close()
    
    from app.core.config import settings
    original_cookie_domain = settings.COOKIE_DOMAIN
    settings.COOKIE_DOMAIN = None
    
    with TestClient(app, base_url="http://localhost") as client_b:
        client_b.post("/api/v1/auth/login", json={"email": email_b, "password": "Pass1234"})
        
        # User B tries to access User A's resume
        res = client_b.post("/api/v1/email/generate", json={"resume_id": resume_id_a, "email_type": "offer"})
        assert res.status_code == 404 # Should not find it
        
    settings.COOKIE_DOMAIN = original_cookie_domain
    
    db = SessionLocal()
    db.query(User).filter(User.id == user_b.id).delete()
    db.commit()
    db.close()