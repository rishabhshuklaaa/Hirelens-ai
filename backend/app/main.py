from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(title="HireLens AI API")


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://hirelens-ai-frontend.*\.vercel\.app|http://localhost:5173",
    allow_credentials=True,  # Cookies are sent with requests
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "HireLens AI Backend is running!"}