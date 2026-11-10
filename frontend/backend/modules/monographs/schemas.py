# monographs/schemas.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class CountrySummary(BaseModel):
    id_country: int
    name: str
    class Config:
        from_attributes = True

class AuthorSummary(BaseModel):
    id_integrant: int
    name: str
    email: Optional[str] = None
    class Config:
        from_attributes = True

class MonographBase(BaseModel):
    title: str
    isbn: str
    pages: str
    number: Optional[str] = None
    month: Optional[str] = None
    keywords: Optional[str] = None
    resume: Optional[str] = None
    cenda: Optional[str] = None
    report_date: Optional[date] = None
    month_only: int = 1
    year_only: int = 2009
    id_country: Optional[int] = None
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: bool = False

class MonographCreate(MonographBase):
    author_ids: List[int]

class MonographUpdate(BaseModel):
    title: Optional[str] = None
    isbn: Optional[str] = None
    pages: Optional[str] = None
    number: Optional[str] = None
    month: Optional[str] = None
    keywords: Optional[str] = None
    resume: Optional[str] = None
    cenda: Optional[str] = None
    report_date: Optional[date] = None
    month_only: Optional[int] = None
    year_only: Optional[int] = None
    id_country: Optional[int] = None
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: Optional[bool] = None
    author_ids: Optional[List[int]] = None

class Monograph(MonographBase):
    id_monograph: int
    country: Optional[CountrySummary] = None
    authors: List[AuthorSummary] = []

    class Config:
        from_attributes = True



class MonographCountByFaculty(BaseModel):
    total_monograph: int
    monograph_in_faculty: int