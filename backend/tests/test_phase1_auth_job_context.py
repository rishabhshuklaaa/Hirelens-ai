import pytest
from fastapi.testclient import TestClient
from app.main import app
import uuid


# Helper function to generate a unique email for each test run
def get_unique_email():
    return f"test_{uuid.uuid4().hex[:8]}@hirelens.com"

# ==========================================
# 1. AUTH EDGE CASES & VALIDATIONS
# ==========================================

def test_signup_success(client):
    """Test: Successful user registration."""
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": get_unique_email(), "password": "StrongPass123"}
    )
    assert response.status_code == 201
    assert "id" in response.json()
    assert "email" in response.json()

def test_signup_short_password_validation(client):
    """Edge Case: Password less than 8 characters should fail (422 Unprocessable Entity)."""
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": get_unique_email(), "password": "123"} # min_length is 8
    )
    assert response.status_code == 422

def test_signup_duplicate_email(client):
    """Edge Case: Registering with an already existing email should fail (400 Bad Request)."""
    email = get_unique_email()
    # First signup
    client.post("/api/v1/auth/signup", json={"email": email, "password": "StrongPass123"})
    # Second signup with same email
    response = client.post("/api/v1/auth/signup", json={"email": email, "password": "StrongPass123"})
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"

def test_login_wrong_password(client):
    """Edge Case: Logging in with incorrect password should fail (401 Unauthorized)."""
    email = get_unique_email()
    client.post("/api/v1/auth/signup", json={"email": email, "password": "StrongPass123"})
    
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword123"} # Incorrect password
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

def test_me_endpoint_unauthorized(client):
    """Edge Case: Accessing /me without logging in should fail (401 Unauthorized)."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated. Token missing."

# ==========================================
# 2. JOB CONTEXT EDGE CASES
# ==========================================

def test_job_context_unauthorized_access(client):
    """Edge Case: Trying to save Job Context without logging in."""
    response = client.post(
        "/api/v1/job-context/",
        json={"company_name": "Google", "company_sector": "Tech", "jd_text": "We need a dev."}
    )
    assert response.status_code == 401

# ==========================================
# 3. END-TO-END (E2E) HAPPY PATH
# ==========================================

def test_full_e2e_flow(client):
    """
    Full E2E Flow: Signup -> Login -> Set Job Context -> Get Job Context -> Duplicate Job Context Error
    """
    # 1. Signup
    email = get_unique_email()
    signup_res = client.post("/api/v1/auth/signup", json={"email": email, "password": "StrongPass123"})
    print("SIGNUP:", signup_res.status_code)
    assert signup_res.status_code == 201

    # 2. Login (TestClient automatically stores the httpOnly cookie here)
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "StrongPass123"})
    print("COOKIES:", dict(client.cookies))
    assert login_res.status_code == 200
    assert login_res.json()["email"] == email

    # 3. Verify Cookie via /me endpoint
    me_res = client.get("/api/v1/auth/me")
    print("ME:", me_res.status_code)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 4. Create Job Context
    job_data = {
        "company_name": "Stripe",
        "company_sector": "FinTech",
        "jd_text": "Looking for a senior backend engineer with Python and FastAPI experience."
    }
    create_job_res = client.post("/api/v1/job-context/", json=job_data)
    assert create_job_res.status_code == 201
    assert create_job_res.json()["company_name"] == "Stripe"

    # 5. Edge Case: Try to create Job Context AGAIN (Should fail as user already has one)
    duplicate_job_res = client.post("/api/v1/job-context/", json=job_data)
    assert duplicate_job_res.status_code == 400
    assert duplicate_job_res.json()["detail"] == "Job context already exists. Use update API."

    # 6. Fetch saved Job Context
    get_job_res = client.get("/api/v1/job-context/")
    assert get_job_res.status_code == 200
    assert get_job_res.json()["company_sector"] == "FinTech"
    assert get_job_res.json()["user_id"] == me_res.json()["id"]

    # 7. Logout
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # 8. Edge Case: Try to access Job Context AFTER logout
    post_logout_res = client.get("/api/v1/job-context/")
    assert post_logout_res.status_code == 401