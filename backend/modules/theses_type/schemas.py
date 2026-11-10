# theses_types/schemas.py
from pydantic import BaseModel
from typing import Optional

class ThesisTypeBase(BaseModel):
    name: Optional[str] = None

class ThesisTypeCreate(ThesisTypeBase):
    pass

class ThesisTypeUpdate(BaseModel):
    name: Optional[str] = None

class ThesisType(ThesisTypeBase):
    id_thesis_type: int

    class Config:
        from_attributes = True