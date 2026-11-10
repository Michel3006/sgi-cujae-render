# docent_degree/schemas.py
from pydantic import BaseModel
from typing import Optional

class DocentDegreeBase(BaseModel):
    name: str

class DocentDegreeCreate(DocentDegreeBase):
    pass

class DocentDegreeUpdate(BaseModel):
    name: Optional[str] = None

class DocentDegree(DocentDegreeBase):
    id_docent_degree: int

    class Config:
        from_attributes = True