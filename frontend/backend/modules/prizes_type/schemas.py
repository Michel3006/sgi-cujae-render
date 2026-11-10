# prizes_types/schemas.py
from pydantic import BaseModel
from typing import Optional

class PrizeTypeBase(BaseModel):
    name: Optional[str] = None

class PrizeTypeCreate(PrizeTypeBase):
    pass

class PrizeTypeUpdate(BaseModel):
    name: Optional[str] = None

class PrizeType(PrizeTypeBase):
    id_prize_type: int

    class Config:
        from_attributes = True