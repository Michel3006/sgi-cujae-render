from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import date

class CountrySummary(BaseModel):
    id_country: int
    name: str
    class Config:
        from_attributes = True

class NormTypeSummary(BaseModel):
    id_norm_type: int
    name: Optional[str] = None
    class Config:
        from_attributes = True

class AuthorSummary(BaseModel):
    id_integrant: int
    name: str
    email: Optional[str] = None
    class Config:
        from_attributes = True

class NewAuthor(BaseModel):
    name: str
    work_center: str
    email: str
    id_country: int

class NormBase(BaseModel):
    title: str
    registration_number: str
    pages: str
    keywords: Optional[str] = None
    resume: Optional[str] = None
    id_norm_type: Optional[int] = None
    report_date: Optional[date] = None
    id_country: Optional[int] = None
    month_only: int = 1
    year_only: int = 2009
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: bool = False

class NormCreate(NormBase):
    author_ids: List[Union[int, NewAuthor]]

class NormUpdate(BaseModel):
    title: Optional[str] = None
    registration_number: Optional[str] = None
    pages: Optional[str] = None
    keywords: Optional[str] = None
    resume: Optional[str] = None
    id_norm_type: Optional[int] = None
    report_date: Optional[date] = None
    id_country: Optional[int] = None
    month_only: Optional[int] = None
    year_only: Optional[int] = None
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: Optional[bool] = None
    author_ids: Optional[List[int]] = None

class Norm(NormBase):
    id_norm: int
    country: Optional[CountrySummary] = None
    norm_type: Optional[NormTypeSummary] = None
    authors: List[AuthorSummary] = []

    class Config:
        from_attributes = True

from pydantic import BaseModel

class NormCountByFaculty(BaseModel):
    total_norms: int
    norms_in_faculty: int

    class Config:
        from_attributes = True  # Pydantic v2 (en v1 sería: orm_mode = True)