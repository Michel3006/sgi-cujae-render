# patents/schemas.py
from pydantic import BaseModel
from typing import List, Optional, Union
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

class NewAuthor(BaseModel):
    name: str
    work_center: str
    email: str
    id_country: int

class PatentBase(BaseModel):
    title: str
    reg_number: str
    yearfiled: str
    language: Optional[str] = None
    assignee: Optional[str] = None
    monthfield: Optional[str] = None
    keywords: Optional[str] = None
    resume: Optional[str] = None
    report_date: Optional[date] = None
    month_only: int = 1
    year_only: int = 2009
    id_country: Optional[int] = None
    is_conceded: bool = False
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: bool = False

class PatentCreate(PatentBase):
    author_ids: List[Union[int, NewAuthor]]

class PatentUpdate(BaseModel):
    title: Optional[str] = None
    reg_number: Optional[str] = None
    yearfiled: Optional[str] = None
    language: Optional[str] = None
    assignee: Optional[str] = None
    monthfield: Optional[str] = None
    keywords: Optional[str] = None
    resume: Optional[str] = None
    report_date: Optional[date] = None
    month_only: Optional[int] = None
    year_only: Optional[int] = None
    id_country: Optional[int] = None
    is_conceded: Optional[bool] = None
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: Optional[bool] = None
    author_ids: Optional[List[int]] = None

class Patent(PatentBase):
    id_patent: int
    country: Optional[CountrySummary] = None
    authors: List[AuthorSummary] = []

    class Config:
        from_attributes = True

from pydantic import BaseModel

class PatentCountByFaculty(BaseModel):
    total_patents: int
    patents_in_faculty: int

    class Config:
        from_attributes = True