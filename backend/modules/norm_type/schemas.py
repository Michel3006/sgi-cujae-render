from pydantic import BaseModel
from typing import Optional

class NormTypeBase(BaseModel):
    name: Optional[str] = None

class NormTypeCreate(NormTypeBase):
    pass

class NormTypeUpdate(BaseModel):
    name: Optional[str] = None

class NormType(NormTypeBase):
    id_norm_type: int

    class Config:
        from_attributes = True