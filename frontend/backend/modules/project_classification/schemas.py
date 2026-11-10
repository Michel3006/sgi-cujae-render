# project_classification/schemas.py
from pydantic import BaseModel
from typing import Optional

class ProjectClassificationBase(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None

class ProjectClassificationCreate(ProjectClassificationBase):
    pass

class ProjectClassificationUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None

class ProjectClassification(ProjectClassificationBase):
    id_project_classification: int

    class Config:
        from_attributes = True