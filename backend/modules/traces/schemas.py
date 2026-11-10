# modules/trace/schemas.py
from enum import Enum
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TraceDateOrder(str, Enum):
    asc = "asc"   # cronológico: más antiguo primero
    desc = "desc"  # más reciente primero

# Resumen del integrante
class IntegrantSummary(BaseModel):
    id_integrant: int
    name: str

    class Config:
        from_attributes = True


class TraceBase(BaseModel):
    id_integrant: Optional[int] = None
    method: Optional[str] = None
    date: Optional[datetime] = None
    route: Optional[str] = None
    message: Optional[str] = None
    response: Optional[int] = None  # Obligatorio según la tabla


class TraceCreate(TraceBase):
    pass


class Trace(TraceBase):
    id_trace: int
    integrant: Optional[IntegrantSummary] = None

    class Config:
        from_attributes = True