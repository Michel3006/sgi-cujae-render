# cientific_degree/schemas.py
from pydantic import BaseModel
from typing import Optional

class CientificDegreeBase(BaseModel):
    name: str

class CientificDegreeCreate(CientificDegreeBase):
    pass

class CientificDegreeUpdate(BaseModel):
    name: Optional[str] = None

class CientificDegree(CientificDegreeBase):
    id_cientific_degree: int

    class Config:
        from_attributes = True