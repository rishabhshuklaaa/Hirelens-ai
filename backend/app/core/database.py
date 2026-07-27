from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Enterprise-grade Engine Setup
# pool_pre_ping: Ensures connections are alive before using them (prevents stale connection errors)
# pool_recycle: Recycle connections after 30 minutes to prevent DB server timeouts
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,       # Number of permanent connections to keep open
    max_overflow=20,    # Allow temporary connections under heavy load
    pool_recycle=1800,  # 30 minutes in seconds
    echo=settings.ENVIRONMENT == "development" # Log SQL queries in dev mode
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy ORM models
Base = declarative_base()

def get_db():
    """
    FastAPI Dependency: Yields a database session for the request.
    Handles rollback automatically on exceptions and ensures safe closure.
    """
    db: Session = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        db.rollback()
        raise e
    finally:
        db.close()