# project_state/schemas.py
from pydantic import BaseModel
from typing import Optional

class ProjectStateBase(BaseModel):
    name: Optional[str] = None

class ProjectStateCreate(ProjectStateBase):
    pass

class ProjectStateUpdate(BaseModel):
    name: Optional[str] = None

class ProjectState(ProjectStateBase):
    id_project_state: int

    class Config:
        from_attributes = True