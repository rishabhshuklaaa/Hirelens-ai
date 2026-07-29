from pydantic import BaseModel, Field, ConfigDict
from typing import List
from app.models.resume import AITierDecision

class AIAnalysisSchema(BaseModel):
    """Strict schema for LLM output."""
    model_config = ConfigDict(use_enum_values=True) # Pydantic v2 config
    
    # Individual vector scores (0-100)
    tech_depth_score: int = Field(..., ge=0, le=100, description="Score for technical depth (surface mention vs demonstrated usage)")
    project_impact_score: int = Field(..., ge=0, le=100, description="Score for project impact, metrics, and production scale")
    career_trajectory_score: int = Field(..., ge=0, le=100, description="Score for upward growth, domain relevance, and job stability")
    resume_quality_score: int = Field(..., ge=0, le=100, description="Score for formatting, readability, and quantified achievements")
    
    #Inverted scale removed. 0 = safe, 100 = high risk
    risk_score: int = Field(..., ge=0, le=100, description="Risk score based on red flags. 0 = no risk, 100 = high risk (gaps, job hopping, etc.)")
    
    # Explainability
    score_justification: str = Field(..., description="Short 2-line summary of why the candidate received this profile rating")
    strong_points: List[str] = Field(..., description="List of skills/experiences where candidate is exceptionally strong")
    missing_skills: List[str] = Field(..., description="Skills required in JD but missing or weak in resume")
    red_flags_identified: List[str] = Field(..., description="List of specific red flags found, if any (e.g., 'Unexplained 2-year gap')")