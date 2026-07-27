from pydantic import BaseModel, EmailStr, ConfigDict, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72) # Edge case handled: 8 char min, 72 char max for bcrypt

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    
    model_config = ConfigDict(from_attributes=True)