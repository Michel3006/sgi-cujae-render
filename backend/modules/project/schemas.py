# project/schemas.py
from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import date
from decimal import Decimal

class IntegrantSummary(BaseModel):
    id_integrant: int
    name: str
    class Config:
        from_attributes = True

class ProjectTypeSummary(BaseModel):
    id_project_type: int
    name: str
    class Config:
        from_attributes = True

class ProjectStateSummary(BaseModel):
    id_project_state: int
    name: Optional[str] = None
    class Config:
        from_attributes = True

class ProjectClassificationSummary(BaseModel):
    id_project_classification: int
    name: Optional[str] = None
    code: Optional[str] = None
    class Config:
        from_attributes = True

class FacultySummary(BaseModel):
    id_faculty: int
    name: str
    class Config:
        from_attributes = True


class ProjectMember(BaseModel):
    id_integrant: int
    name: str
    admin: Optional[bool]= False
    class Config:
        from_attributes = True

class NewIntegrant(BaseModel):
    name: str
    work_center: str
    email: str
    id_country: int

class ProjectBase(BaseModel):
    title: str
    code: str
    id_responsible: Optional[int] = None
    thematic: Optional[str] = None
    id_project_type: Optional[int] = None
    art_state: Optional[str] = None
    cientific_problem: Optional[str] = None
    study_object: Optional[str] = None
    study_field: Optional[str] = None
    hypothesis: Optional[str] = None
    main_objective: Optional[str] = None
    research_methods: Optional[str] = None
    interested_third_party: Optional[str] = None
    national_group: Optional[str] = None
    international_group: Optional[str] = None
    publish_magazine: Optional[str] = None
    participate_events: Optional[str] = None
    citma_code: Optional[str] = None
    minvec_code: Optional[str] = None
    approved: bool = False
    conseil_criteria: Optional[str] = None
    initial_date: Optional[date] = None
    final_date: Optional[date] = None
    update_date: Optional[date] = None
    id_project_state: Optional[int] = None
    id_project_classification: Optional[int] = None
    economic_budget: Optional[str] = None
    economic_needs: Optional[str] = None
    id_faculty: Optional[int] = None
    concluded: bool = False
    approved_date: Optional[date] = None
    general_budget_cup: Optional[Decimal] = None
    year_budget_cup: Optional[Decimal] = None
    is_international: bool = False
    is_national: bool = False
    is_territorial: bool = False
    is_cujae: bool = False
    keywords: str

class ProjectCreate(ProjectBase):
    member_ids: List[Union[int, NewIntegrant]]

class ProjectDelete(BaseModel):
    id_project: int
class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    id_responsible: Optional[int] = None
    thematic: Optional[str] = None
    id_project_type: Optional[int] = None
    art_state: Optional[str] = None
    cientific_problem: Optional[str] = None
    study_object: Optional[str] = None
    study_field: Optional[str] = None
    hypothesis: Optional[str] = None
    main_objective: Optional[str] = None
    research_methods: Optional[str] = None
    interested_third_party: Optional[str] = None
    national_group: Optional[str] = None
    international_group: Optional[str] = None
    publish_magazine: Optional[str] = None
    participate_events: Optional[str] = None
    citma_code: Optional[str] = None
    minvec_code: Optional[str] = None
    approved: Optional[bool] = None
    conseil_criteria: Optional[str] = None
    initial_date: Optional[date] = None
    final_date: Optional[date] = None
    update_date: Optional[date] = None
    id_project_state: Optional[int] = None
    id_project_classification: Optional[int] = None
    economic_budget: Optional[str] = None
    economic_needs: Optional[str] = None
    id_faculty: Optional[int] = None
    concluded: Optional[bool] = None
    approved_date: Optional[date] = None
    general_budget_cup: Optional[Decimal] = None
    year_budget_cup: Optional[Decimal] = None
    is_international: Optional[bool] = None
    is_national: Optional[bool] = None
    is_territorial: Optional[bool] = None
    is_cujae: Optional[bool] = None
    member_ids: Optional[List[int]] = []
    keywords: str
   
    # Nota: Para simplificar, no actualizamos miembros/keywords en este esquema.
    # Si lo necesitas, se puede agregar.

class Project(ProjectBase):
    id_project: int
    responsible: Optional[IntegrantSummary] = None
    project_type: Optional[ProjectTypeSummary] = None
    project_state: Optional[ProjectStateSummary] = None
    project_classification: Optional[ProjectClassificationSummary] = None
    faculty: Optional[FacultySummary] = None

    class Config:
        from_attributes = True
class ProjectWithMembers(Project):
    members: List[ProjectMember] = []

from pydantic import BaseModel

class ProjectCountByFaculty(BaseModel):
    faculty_name: str
    project_count: int