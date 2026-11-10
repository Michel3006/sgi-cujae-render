# auth/schemas.py
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from modules.integrant.schemas import IntegrantCreate as BaseIntegrantCreate

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    # Incluir todos los campos de IntegrantCreate, pero sin id_integrant
    name: str
    identity: Optional[str] = None
    external: Optional[bool] = None
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
    role_ids: Optional[List[int]] = [1]  # IDs de roles a asignar

class TokenAndId(BaseModel):
    access_token: str
    user_id: int
    token_type: str = "bearer"

class TokenData(BaseModel):
    integrant_id: int
    roles: List[str]  # Nombres de roles