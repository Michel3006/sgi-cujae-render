# faculties_areas/schemas.py
from pydantic import BaseModel
from typing import Optional

class FacultyAreaBase(BaseModel):
    name: Optional[str] = None
    id_faculty: Optional[int] = None

class FacultyAreaCreate(FacultyAreaBase):
    name: str
    id_faculty: int  # Requerido al crear

class FacultyAreaUpdate(BaseModel):
    name: Optional[str] = None
    id_faculty: Optional[int] = None

class FacultyArea(FacultyAreaBase):
    id_faculty_area: int

    class Config:
        from_attributes = True