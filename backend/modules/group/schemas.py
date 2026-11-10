# group/schemas.py
from pydantic import BaseModel
from typing import List, Optional,Union
from datetime import datetime

class IntegrantSummary(BaseModel):
    id_integrant: int
    name: str
    email: Optional[str] = None
    class Config:
        from_attributes = True

class FacultySummary(BaseModel):
    id_faculty: int
    name: str
    class Config:
        from_attributes = True
class NewIntegrant(BaseModel):
    name: str
    work_center: str
    email: str
    id_country: int

class FacultyAreaSummary(BaseModel):
    id_faculty_area: int
    name: Optional[str] = None
    class Config:
        from_attributes = True

class GroupMember(BaseModel):
    id_integrant: int
    name: str
    admin: Optional[bool]= False
    class Config:
        from_attributes = True

class GroupBase(BaseModel):
    name: str
    subjects: str
    problems: str
    id_faculty_area: Optional[int] = None
    id_admin: int  # Líder (requerido)
    id_faculty: int    # Requerido
    create_date: datetime
    update_date: datetime

class GroupCreate(GroupBase):
    member_ids: List[Union[int, NewIntegrant]] # IDs de integrantes a agregar como miembros (sin admin)

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    subjects: Optional[str] = None
    problems: Optional[str] = None
    id_faculty_area: Optional[int] = None
    id_admin: Optional[int] = None  # Nuevo líder
    id_faculty: Optional[int] = None
    update_date: Optional[datetime] = None
    member_update_ids: List[int] = []
    # Para actualizar miembros, se puede hacer en otro endpoint, o aquí con lógica compleja.
    # Por simplicidad, NO incluimos member_ids/admin_ids en update aquí.

class GroupDelete(BaseModel):
    id_group:int

class Group(GroupBase):
    id_group: int
    faculty: Optional[FacultySummary] = None
    faculty_area: Optional[FacultyAreaSummary] = None
    members: List[GroupMember] = []

    class Config:
        from_attributes = True

from pydantic import BaseModel

class GroupCountByFaculty(BaseModel):
    faculty_name: str
    group_count: int

class GroupWithMemberCount(BaseModel):
    group_name: str
    member_count: int