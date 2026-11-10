# project_type/schemas.py
from pydantic import BaseModel
from typing import Optional

class ProjectTypeBase(BaseModel):
    name: str

class ProjectTypeCreate(ProjectTypeBase):
    pass

class ProjectTypeUpdate(BaseModel):
    name: Optional[str] = None

class ProjectType(ProjectTypeBase):
    id_project_type: int

    class Config:
        from_attributes = True