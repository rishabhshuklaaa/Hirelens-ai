from fastapi import APIRouter
from app.api.v1.endpoints import auth, job_context, batch,resume

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(job_context.router)
api_router.include_router(batch.router)
api_router.include_router(resume.router)