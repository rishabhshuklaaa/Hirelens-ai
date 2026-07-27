import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.main import app
from app.core.config import settings
from fastapi.testclient import TestClient

# Use a separate test database to keep dev DB clean
TEST_DATABASE_URL = "postgresql+psycopg2://postgres:rishabh@localhost:5432/hirelens-ai_test_db"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db

    orig_domain = settings.COOKIE_DOMAIN
    orig_env = settings.ENVIRONMENT
    settings.COOKIE_DOMAIN = None          # no Domain attr
    settings.ENVIRONMENT = "development"    # secure=False → http pe cookie chalegi

    try:
        with TestClient(app) as c:
            yield c
    finally:
        settings.COOKIE_DOMAIN = orig_domain
        settings.ENVIRONMENT = orig_env
        app.dependency_overrides.clear()