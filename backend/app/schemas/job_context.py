from pydantic import BaseModel, ConfigDict
from datetime import datetime

class JobContextBase(BaseModel):
    company_name: str
    company_sector: str
    jd_text: str

class JobContextCreate(JobContextBase):
    pass

class JobContextResponse(JobContextBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)