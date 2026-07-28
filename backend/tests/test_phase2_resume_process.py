import pytest
import os
import fitz  # PyMuPDF
import io
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.job_context import JobContext
from app.models.resume import Resume, ResumeStatus
from app.core.security import get_password_hash
import uuid

# Ensure test DB tables exist
Base.metadata.create_all(bind=engine)

# ==========================================
# HELPER FUNCTIONS & FIXTURES
# ==========================================

def create_dummy_pdf(num_pages: int = 1, text_content: str = "Sample Resume Text") -> bytes:
    """Generates a dummy PDF in memory for testing."""
    doc = fitz.open()
    for _ in range(num_pages):
        page = doc.new_page()
        page.insert_text((50, 72), text_content)
    byte_stream = io.BytesIO()
    doc.save(byte_stream)
    doc.close()
    return byte_stream.getvalue()

@pytest.fixture(scope="function")
def auth_client():
    """Creates a user, logs them in, sets up Job Context, and returns TestClient with cookies."""
    db = SessionLocal()
    
    # Setup User
    email = f"test_{uuid.uuid4().hex[:8]}@hirelens.com"
    user = User(email=email, hashed_password=get_password_hash("StrongPass123"))
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Setup Job Context
    job_context = JobContext(
        user_id=user.id,
        company_name="Test Corp",
        company_sector="Tech",
        job_title="Backend Dev",
        jd_text="Looking for a Python FastAPI developer with AWS experience."
    )
    db.add(job_context)
    db.commit()
    db.refresh(job_context)
    
    # Override settings for TestClient cookie compatibility
    from app.core.config import settings
    original_cookie_domain = settings.COOKIE_DOMAIN
    settings.COOKIE_DOMAIN = None
    
    with TestClient(app, base_url="http://localhost") as client:
        client.post("/api/v1/auth/login", json={"email": email, "password": "StrongPass123"})
        # Pass job_context_id for upload tests via a closure or global state if needed, 
        # but we'll fetch it directly in tests.
        yield (client, job_context.id)
        
    settings.COOKIE_DOMAIN = original_cookie_domain
    
    # Teardown
    db.query(Resume).filter(Resume.user_id == user.id).delete()
    db.query(JobContext).filter(JobContext.id == job_context.id).delete()
    db.query(User).filter(User.id == user.id).delete()
    db.commit()
    db.close()

# ==========================================
# 1. UPLOAD VALIDATION EDGE CASES
# ==========================================

def test_upload_more_than_10_files(auth_client):
    client, job_context_id = auth_client
    files = [("files", ("test.pdf", create_dummy_pdf(1), "application/pdf"))] * 11
    response = client.post(
        f"/api/v1/batch/upload?job_context_id={job_context_id}", # Appending as query param for simplicity in test, 
        files=files,                                              # Note: Update endpoint if using Form data strictly
        data={"job_context_id": str(job_context_id)}
    )
    assert response.status_code == 400
    assert "between 1 and 10" in response.json()["detail"]

def test_upload_invalid_file_type(auth_client):
    """Edge Case: Uploading a .txt file instead of PDF should fail."""
    client, job_context_id = auth_client
    files = [("files", ("test.txt", b"this is a text file", "text/plain"))]
    response = client.post(
        "/api/v1/batch/upload",
        files=files,
        data={"job_context_id": str(job_context_id)}
    )
    assert response.status_code == 400
    assert "not a valid PDF" in response.json()["detail"]

def test_upload_without_job_context(auth_client):
    """Edge Case: Uploading without job_context_id."""
    client, _ = auth_client
    files = [("files", ("test.pdf", create_dummy_pdf(1), "application/pdf"))]
    response = client.post(
        "/api/v1/batch/upload",
        files=files
        # Missing job_context_id form data
    )
    assert response.status_code == 422 # Unprocessable Entity

# ==========================================
# 2. GATEKEEPER & BACKGROUND PROCESSING
# ==========================================

def test_gatekeeper_1_page_pdf_auto_added(auth_client):
    """Test: 1-page PDF should be processed and marked AUTO_ADDED."""
    client, job_context_id = auth_client
    pdf_bytes = create_dummy_pdf(1, "Python FastAPI developer with AWS")
    
    files = [("files", ("resume_1_page.pdf", pdf_bytes, "application/pdf"))]
    response = client.post("/api/v1/batch/upload", files=files, data={"job_context_id": str(job_context_id)})
    assert response.status_code == 202
    
    batch_id = response.json()["batch_id"]
    
    # Wait for background task to complete (poll DB or use a small sleep)
    import time
    time.sleep(2) 
    
    # Fetch all resumes
    res_res = client.get("/api/v1/resume/all")
    assert res_res.status_code == 200
    
    resumes = res_res.json()
    assert len(resumes) == 1
    assert resumes[0]["status"] == "AUTO_ADDED"
    assert resumes[0]["page_count"] == 1
    assert resumes[0]["quick_score"] is not None

def test_gatekeeper_2_page_pdf_needs_review(auth_client):
    """Test: 2-page PDF should be marked NEEDS_REVIEW."""
    client, job_context_id = auth_client
    pdf_bytes = create_dummy_pdf(2, "Some generic text")
    
    files = [("files", ("resume_2_page.pdf", pdf_bytes, "application/pdf"))]
    response = client.post("/api/v1/batch/upload", files=files, data={"job_context_id": str(job_context_id)})
    assert response.status_code == 202
    
    import time
    time.sleep(2)
    
    res_res = client.get("/api/v1/resume/all")
    resumes = res_res.json()
    assert len(resumes) == 1
    assert resumes[0]["status"] == "NEEDS_REVIEW"
    assert resumes[0]["page_count"] == 2

def test_gatekeeper_duplicate_skipped(auth_client):
    """Test: Uploading the same PDF twice should mark the second one as DUPLICATE_SKIPPED."""
    client, job_context_id = auth_client
    pdf_bytes = create_dummy_pdf(1, "Unique resume text")
    
    # First Upload
    files = [("files", ("resume_dup.pdf", pdf_bytes, "application/pdf"))]
    client.post("/api/v1/batch/upload", files=files, data={"job_context_id": str(job_context_id)})
    
    import time
    time.sleep(4)
    
    # Second Upload (Same file)
    client.post("/api/v1/batch/upload", files=files, data={"job_context_id": str(job_context_id)})
    time.sleep(4)
    
    res_res = client.get("/api/v1/resume/all")
    resumes = res_res.json()
    
    assert len(resumes) == 2
    statuses = [r["status"] for r in resumes]
    assert "AUTO_ADDED" in statuses
    assert "DUPLICATE_SKIPPED" in statuses

# ==========================================
# 3. OVERRIDE & DELETE API
# ==========================================

def test_override_needs_review_success(auth_client):
    """Test: Recruiter can add a NEEDS_REVIEW resume to the pipeline."""
    client, job_context_id = auth_client
    pdf_bytes = create_dummy_pdf(2, "Text")
    
    files = [("files", ("resume_2p.pdf", pdf_bytes, "application/pdf"))]
    client.post("/api/v1/batch/upload", files=files, data={"job_context_id": str(job_context_id)})
    
    import time
    time.sleep(2)
    
    resumes = client.get("/api/v1/resume/all").json()
    resume_id = resumes[0]["id"]
    
    # Override Status
    response = client.patch(f"/api/v1/resume/{resume_id}", json={"status": "ADDED_BY_RECRUITER"})
    assert response.status_code == 200
    assert response.json()["status"] == "ADDED_BY_RECRUITER"

def test_delete_resume_success(auth_client):
    """Test: Recruiter can delete a resume."""
    client, job_context_id = auth_client
    pdf_bytes = create_dummy_pdf(1, "Text to delete")
    
    files = [("files", ("resume_del.pdf", pdf_bytes, "application/pdf"))]
    client.post("/api/v1/batch/upload", files=files, data={"job_context_id": str(job_context_id)})
    
    import time
    time.sleep(2)
    
    resumes = client.get("/api/v1/resume/all").json()
    resume_id = resumes[0]["id"]
    
    # Delete
    del_res = client.delete(f"/api/v1/resume/{resume_id}")
    assert del_res.status_code == 204
    
    # Verify it's gone
    all_resumes = client.get("/api/v1/resume/all").json()
    assert len(all_resumes) == 0