from pydantic import BaseModel
from typing import Optional

class ResearchTaskStateBase(BaseModel):
    name: Optional[str] = None

class ResearchTaskStateCreate(ResearchTaskStateBase):
    pass

class ResearchTaskStateUpdate(BaseModel):
    name: Optional[str] = None

class ResearchTaskState(ResearchTaskStateBase):
    id_research_task_state: int

    class Config:
        from_attributes = True