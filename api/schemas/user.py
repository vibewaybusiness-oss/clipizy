from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    password: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class UserRead(UserBase):
    id: UUID
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        orm_mode = True