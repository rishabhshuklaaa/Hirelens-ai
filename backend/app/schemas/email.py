from pydantic import BaseModel, Field
from typing import Literal

class EmailGenerateRequest(BaseModel):
    resume_id: int
    email_type: Literal["offer", "assessment", "interview", "rejection"]

class EmailContent(BaseModel):
    """Structured output schema for LLM email generation."""
    subject: str = Field(..., description="Professional email subject line")
    body: str = Field(..., description="Email body in plain text, with line breaks")

# FIX: Removed to_email to prevent open-relay abuse. Recipient is derived from DB.
class EmailSendRequest(BaseModel):
    resume_id: int
    subject: str
    body: str
    email_type: str # e.g. "offer", "rejection"