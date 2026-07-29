import pytest
import fitz
import io
import time
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.job_context import JobContext
from app.models.resume import Resume, ResumeStatus, AIStatus, AITierDecision, RecruiterDecision
from app.schemas.audit import AIAnalysisSchema
from app.core.security import get_password_hash
from app.services.ai_engine import calculate_overall_score_and_tier
import uuid


# ==========================================
# HELPER FUNCTIONS & FIXTURES
# ==========================================

def create_dummy_pdf(text="Sample Resume Text for Phase 3"):
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text)
    byte_stream = io.BytesIO()
    doc.save(byte_stream)
    doc.close()
    return byte_stream.getvalue()

def wait_for_gatekeeper(db, batch_id, timeout=10):
    """Polls DB until gatekeeper processes resumes or times out."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        resumes = db.query(Resume).filter(Resume.batch_id == batch_id).all()
        if resumes and all(r.cleaned_text is not None for r in resumes):
            return True
        time.sleep(0.5)
    return False

@pytest.fixture(scope="function")
def auth_client_with_resumes():
    """Creates a user, job context, uploads 2 PDFs, and waits for gatekeeper."""
    db = SessionLocal()
    email = f"test_{uuid.uuid4().hex[:8]}@hirelens.com"
    user = User(email=email, hashed_password=get_password_hash("StrongPass123"))
    db.add(user)
    db.commit()
    db.refresh(user)
    
    job_context = JobContext(user_id=user.id, company_name="Test Corp", company_sector="Tech", job_title="Backend Dev", jd_text="Need Python developer")
    db.add(job_context)
    db.commit()
    db.refresh(job_context)
    
    from app.core.config import settings
    original_cookie_domain = settings.COOKIE_DOMAIN
    settings.COOKIE_DOMAIN = None
    
    with TestClient(app, base_url="http://localhost") as client:
        client.post("/api/v1/auth/login", json={"email": email, "password": "StrongPass123"})
        
        files = [
            ("files", ("resume1.pdf", create_dummy_pdf("Python FastAPI experience"), "application/pdf")),
            ("files", ("resume2.pdf", create_dummy_pdf("Java Spring Boot experience"), "application/pdf"))
        ]
        upload_res = client.post("/api/v1/batch/upload", files=files, data={"job_context_id": str(job_context.id)})
        batch_id = upload_res.json()["batch_id"]
        
        assert wait_for_gatekeeper(db, batch_id), "Gatekeeper did not process in time"
        
        yield (client, batch_id, user.id)
        
    settings.COOKIE_DOMAIN = original_cookie_domain
    
    db.query(Resume).filter(Resume.user_id == user.id).delete()
    db.query(JobContext).filter(JobContext.id == job_context.id).delete()
    db.query(User).filter(User.id == user.id).delete()
    db.commit()
    db.close()

# ==========================================
# 1. AI ENGINE LOGIC TESTS (Pure Unit Tests)
# ==========================================

def test_score_calculation_strong_fit():
    """Test: High scores with low risk should yield STRONG_FIT."""
    mock_ai_data = AIAnalysisSchema(
        tech_depth_score=90, project_impact_score=80, career_trajectory_score=80,
        resume_quality_score=90, risk_score=10,
        score_justification="Great dev", strong_points=["Python"], missing_skills=[], red_flags_identified=[]
    )
    overall, tier = calculate_overall_score_and_tier(mock_ai_data)
    expected_overall = (90*0.35) + (80*0.35) + (80*0.15) + (90*0.15)
    assert overall == round(expected_overall, 2)
    assert tier == AITierDecision.STRONG_FIT

def test_score_calculation_maybe_boundary():
    """Test: Score >= 50 and risk < 50 should yield MAYBE."""
    mock_ai_data = AIAnalysisSchema(
        tech_depth_score=60, project_impact_score=60, career_trajectory_score=60,
        resume_quality_score=60, risk_score=10,
        score_justification="Average dev", strong_points=[], missing_skills=[], red_flags_identified=[]
    )
    overall, tier = calculate_overall_score_and_tier(mock_ai_data)
    assert tier == AITierDecision.MAYBE
    assert overall == 60.0

def test_score_calculation_high_risk_penalty_and_clamp():
    """Test: High risk penalizes score and clamps to 0.0 if necessary, yields NO."""
    mock_ai_data = AIAnalysisSchema(
        tech_depth_score=10, project_impact_score=10, career_trajectory_score=10,
        resume_quality_score=10, risk_score=100, # Max risk
        score_justification="Risky dev", strong_points=[], missing_skills=[], red_flags_identified=["Job hopping"]
    )
    overall, tier = calculate_overall_score_and_tier(mock_ai_data)
    expected_overall = (10*0.35) + (10*0.35) + (10*0.15) + (10*0.15)
    expected_overall -= (100 * 0.2) 
    assert overall == 0.0 # Should clamp to 0
    assert tier == AITierDecision.NO

# ==========================================
# 2. CRITICAL PATH: NEVER-STUCK & RATE-LIMIT SAFE
# ==========================================

def test_audit_marks_failed_when_no_text(auth_client_with_resumes):
    """Test: If cleaned_text is missing, resume should be AI_FAILED, NOT stuck at PENDING_AI."""
    from app.services.ai_engine import run_ai_audit_for_resume
    client, batch_id, _ = auth_client_with_resumes
    db = SessionLocal()
    
    r = db.query(Resume).filter(Resume.batch_id == batch_id).first()
    r.cleaned_text = None
    rid = r.id
    db.commit()
    db.close()

    run_ai_audit_for_resume(rid)  # Call real engine directly

    db = SessionLocal()
    r = db.get(Resume, rid)
    status = r.ai_status
    db.close()
    
    assert status == AIStatus.AI_FAILED

def test_persistent_failure_marks_ai_failed(auth_client_with_resumes):
    """Test A: Persistent failure -> fast AI_FAILED."""
    client, batch_id, _ = auth_client_with_resumes
    
    # FIX: Removed time.sleep patch as ai_engine.py doesn't use it.
    with patch("app.services.ai_engine.ChatGroq") as MockChatGroq:
        MockChatGroq.return_value.invoke.side_effect = Exception("Simulated LLM crash")  # No "rate limit" keyword
        
        # FastAPI TestClient will block until background task finishes
        client.post(f"/api/v1/audit/batch/{batch_id}/run-audit")
        
    data = client.get(f"/api/v1/audit/batch/{batch_id}/results").json()
    assert all(r["ai_status"] == "AI_FAILED" for r in data), "Should be AI_FAILED, not stuck at PENDING_AI"


def test_rate_limit_recovers_no_stuck(auth_client_with_resumes):
    """Test B: Transient failure -> recovers -> AI_SCORED for all resumes."""
    from app.services.ai_engine import run_ai_audit_for_resume
    client, batch_id, _ = auth_client_with_resumes
    
    db = SessionLocal()
    resume_ids = [r.id for r in db.query(Resume).filter(Resume.batch_id == batch_id).all()]
    db.close()

    valid_json = '{"tech_depth_score": 70, "project_impact_score": 70, "career_trajectory_score": 70, "resume_quality_score": 70, "risk_score": 10, "score_justification": "Good", "strong_points": ["Python"], "missing_skills": [], "red_flags_identified": []}'
    mock_response = MagicMock()
    mock_response.content = valid_json

    with patch("app.services.ai_engine.ChatGroq") as MockChatGroq:
        mock_instance = MockChatGroq.return_value
        
        # Simulate transient errors for first two resumes, then succeed
        responses = [
            Exception("Simulated transient error"), mock_response, # Resume 1: Fail -> Pass
            Exception("Simulated transient error"), mock_response  # Resume 2: Fail -> Pass
        ]
        mock_instance.invoke.side_effect = responses
        
        # Run engine directly for all resumes
        for rid in resume_ids:
            run_ai_audit_for_resume(rid)
            
    db = SessionLocal()
    for rid in resume_ids:
        r = db.get(Resume, rid)
        assert r.ai_status == AIStatus.AI_SCORED, f"Resume {rid} should recover and be AI_SCORED"
    db.close()

# ==========================================
# 3. API & SECURITY TESTS
# ==========================================

def test_needs_review_resumes_are_skipped(auth_client_with_resumes):
    """Test: Resumes in NEEDS_REVIEW should not be sent to AI engine."""
    client, batch_id, _ = auth_client_with_resumes
    db = SessionLocal()
    
    for r in db.query(Resume).filter(Resume.batch_id == batch_id).all():
        r.status = ResumeStatus.NEEDS_REVIEW
    db.commit()
    db.close()
    
    with patch("app.api.v1.endpoints.audit.run_ai_audit_for_resume") as mock_engine:
        res = client.post(f"/api/v1/audit/batch/{batch_id}/run-audit")
        assert res.status_code == 400 # Should reject because no eligible resumes
        mock_engine.assert_not_called()

def test_ownership_isolation(auth_client_with_resumes):
    """Test: User B cannot access User A's batch results."""
    client_a, batch_id, user_a_id = auth_client_with_resumes
    
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
        res = client_b.get(f"/api/v1/audit/batch/{batch_id}/results")
        assert res.status_code == 404 # Should not find it
        
    settings.COOKIE_DOMAIN = original_cookie_domain
    
    db = SessionLocal()
    db.query(User).filter(User.id == user_b.id).delete()
    db.commit()
    db.close()

def test_invalid_decision_validation(auth_client_with_resumes):
    """Test: Passing invalid decision string should return 422."""
    client, batch_id, _ = auth_client_with_resumes
    db = SessionLocal()
    resume = db.query(Resume).filter(Resume.batch_id == batch_id).first()
    db.close()
    
    res = client.patch(f"/api/v1/resume/{resume.id}/decision", json={"decision": "GARBAGE"})
    assert res.status_code == 422

def test_get_audit_results_sorted_desc(auth_client_with_resumes):
    """Test: Results must be sorted by AI overall score descending."""
    client, batch_id, _ = auth_client_with_resumes
    db = SessionLocal()
    
    resumes = db.query(Resume).filter(Resume.batch_id == batch_id).all()
    resumes[0].ai_status = AIStatus.AI_SCORED
    resumes[0].ai_overall_score = 45.0
    resumes[1].ai_status = AIStatus.AI_SCORED
    resumes[1].ai_overall_score = 88.0
    db.commit()
    db.close()
    
    res = client.get(f"/api/v1/audit/batch/{batch_id}/results")
    data = res.json()
    assert data[0]["ai_overall_score"] == 88.0
    assert data[1]["ai_overall_score"] == 45.0