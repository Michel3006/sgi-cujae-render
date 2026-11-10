
from modules.roles.schemas import RoleBase

# integrant/schemas.py
from pydantic import BaseModel
from typing import Optional, List

# Esquemas anidados mínimos (solo para lectura)
class CountrySummary(BaseModel):
    id_country: int
    name: str
    class Config:
        from_attributes = True

class DocentDegreeSummary(BaseModel):
    id_docent_degree: int
    name: str
    class Config:
        from_attributes = True

class CientificDegreeSummary(BaseModel):
    id_cientific_degree: int
    name: str
    class Config:
        from_attributes = True

class FacultySummary(BaseModel):
    id_faculty: int
    name: str
    class Config:
        from_attributes = True

class FacultyAreaSummary(BaseModel):
    id_faculty_area: int
    name: str
    class Config:
        from_attributes = True

class GeneralCategorySummary(BaseModel):
    id_general_category: int
    name: str
    class Config:
        from_attributes = True

# Esquema base
class IntegrantBase(BaseModel):
    name: str
    identity: Optional[str] = ""
    external: bool
    email: Optional[str] = ""
    phone: Optional[str] = ""
    available_time: Optional[int] = None
    work_center: Optional[str] = None
    curriculum: Optional[str] = None
    id_faculty_area: Optional[int] = None
    id_cientific_degree: Optional[int] = None
    id_country: Optional[int] = None
    id_faculty: Optional[int] = None
    id_docent_degree: Optional[int] = None
    id_general_category: Optional[int] = None

class IntegrantCreate(IntegrantBase):
        roles_list: Optional[List[int]] = None

class IntegrantUpdate(BaseModel):
    name: Optional[str] = None
    identity: Optional[str] = None
    external: Optional[bool] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    available_time: Optional[int] = None
    work_center: Optional[str] = None
    curriculum: Optional[str] = None
    id_faculty_area: Optional[int] = None
    id_cientific_degree: Optional[int] = None
    id_country: Optional[int] = None
    id_faculty: Optional[int] = None
    id_docent_degree: Optional[int] = None
    id_general_category: Optional[int] = None
    roles_list: Optional[List[int]] = None

class IntegrantGet(IntegrantBase):
    id_integrant: int

    # Incluir datos relacionados en la respuesta (opcional pero útil)
    country: Optional[CountrySummary] = None
    docent_degree: Optional[DocentDegreeSummary] = None
    cientific_degree: Optional[CientificDegreeSummary] = None
    faculty: Optional[FacultySummary] = None
    faculty_area: Optional[FacultyAreaSummary] = None
    general_category: Optional[GeneralCategorySummary] = None

    class Config:
        from_attributes = True

class IntegrantWithRoles(IntegrantGet):
    roles: list[RoleBase]

    class Config:
        from_attributes = True