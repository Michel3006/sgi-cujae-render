from pydantic import BaseModel
from typing import Optional

class EncounterTypeBase(BaseModel):
    name: Optional[str] = None

class EncounterTypeCreate(EncounterTypeBase):
    pass

class EncounterTypeUpdate(BaseModel):
    name: Optional[str] = None

class EncounterType(EncounterTypeBase):
    id_encounter_type: int

    class Config:
        from_attributes = True