from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class IntegrantSummary(BaseModel):
    id_integrant: int
    name: str
    class Config:
        from_attributes = True

class ProjectSummary(BaseModel):
    id_project: int
    title: str
    class Config:
        from_attributes = True

class ResearchTaskStateSummary(BaseModel):
    id_research_task_state: int
    name: Optional[str] = None
    class Config:
        from_attributes = True

class ResearchTaskBase(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    id_responsible: Optional[int] = None
    initial_date: Optional[date] = None
    final_date: Optional[date] = None
    id_project: Optional[int] = None
    sort_order: int = 0
    id_research_task_state: Optional[int] = None
    compliance_report: Optional[str] = None
    remote_task: bool = False
    estimation_time: Optional[int] = None
    execution_time: Optional[int] = None

class ResearchTaskCreate(ResearchTaskBase):
    pass

class ResearchTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    id_responsible: Optional[int] = None
    initial_date: Optional[date] = None
    final_date: Optional[date] = None
    id_project: Optional[int] = None
    sort_order: Optional[int] = None
    id_research_task_state: Optional[int] = None
    compliance_report: Optional[str] = None
    remote_task: Optional[bool] = None
    estimation_time: Optional[int] = None
    execution_time: Optional[int] = None

class ResearchTask(ResearchTaskBase):
    id_research_task: int
    responsible: Optional[IntegrantSummary] = None
    project: Optional[ProjectSummary] = None
    state: Optional[ResearchTaskStateSummary] = None

    class Config:
        from_attributes = True