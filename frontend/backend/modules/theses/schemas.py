# theses/schemas.py
from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import date

class CountrySummary(BaseModel):
    id_country: int
    name: str
    class Config:
        from_attributes = True

class ThesisTypeSummary(BaseModel):
    id_thesis_type: int
    name: Optional[str] = None
    class Config:
        from_attributes = True

class AuthorSummary(BaseModel):
    id_integrant: int
    name: str
    email: Optional[str] = None
    class Config:
        from_attributes = True

# Usamos el mismo esquema para tutores (son también integrants)
TutorSummary = AuthorSummary

class NewAuthor(BaseModel):
    name: str
    work_center: str
    email: str
    id_country: int

class ThesisBase(BaseModel):
    title: str
    institution: str
    keywords: Optional[str] = None
    resume: Optional[str] = None
    id_thesis_type: Optional[int] = None
    report_date: Optional[date] = None
    id_country: Optional[int] = None
    month_only: int = 1
    year_only: int = 2009
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: bool = False

class ThesisCreate(ThesisBase):
    author_ids: List[Union[int, NewAuthor]]
    tutor_ids: List[Union[int, NewAuthor]]

class ThesisUpdate(BaseModel):
    title: Optional[str] = None
    institution: Optional[str] = None
    keywords: Optional[str] = None
    resume: Optional[str] = None
    id_thesis_type: Optional[int] = None
    report_date: Optional[date] = None
    id_country: Optional[int] = None
    month_only: Optional[int] = None
    year_only: Optional[int] = None
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: Optional[bool] = None
    author_ids: Optional[List[int]] = None
    tutor_ids: Optional[List[int]] = None

class Thesis(ThesisBase):
    id_thesis: int
    country: Optional[CountrySummary] = None
    thesis_type: Optional[ThesisTypeSummary] = None
    authors: List[AuthorSummary] = []
    tutors: List[TutorSummary] = []

    class Config:
        from_attributes = True

from pydantic import BaseModel

class ThesisCountByFaculty(BaseModel):
    total_theses: int
    theses_in_faculty: int

    class Config:
        from_attributes = True