# faculty/schemas.py
from pydantic import BaseModel
from typing import Optional

class FacultyBase(BaseModel):
    name: str
    fullname: Optional[str] = None

class FacultyCreate(FacultyBase):
    pass

class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    fullname: Optional[str] = None

class Faculty(FacultyBase):
    id_faculty: int

    class Config:
        from_attributes = True  # Pydantic v2 (reemplaza orm_mode)