# prizes/schemas.py
from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import date

class CountrySummary(BaseModel):
    id_country: int
    name: str
    class Config:
        from_attributes = True

class PrizeTypeSummary(BaseModel):
    id_prize_type: int
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

class PrizeBase(BaseModel):
    title: str
    grant_institution: str
    keywords: Optional[str] = None
    resume: Optional[str] = None
    id_prize_type: Optional[int] = None
    report_date: Optional[date] = None
    id_country: Optional[int] = None
    month_only: int = 1
    year_only: int = 2009
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: bool = False

class PrizeCreate(PrizeBase):
    author_ids: List[Union[int, NewAuthor]]

class PrizeUpdate(BaseModel):
    title: Optional[str] = None
    grant_institution: Optional[str] = None
    keywords: Optional[str] = None
    resume: Optional[str] = None
    id_prize_type: Optional[int] = None
    report_date: Optional[date] = None
    id_country: Optional[int] = None
    month_only: Optional[int] = None
    year_only: Optional[int] = None
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: Optional[bool] = None
    author_ids: Optional[List[int]] = None

class Prize(PrizeBase):
    id_prize: int
    country: Optional[CountrySummary] = None
    prize_type: Optional[PrizeTypeSummary] = None
    authors: List[AuthorSummary] = []

    class Config:
        from_attributes = True

from pydantic import BaseModel

class PrizeCountByFaculty(BaseModel):
    total_prizes: int
    prizes_in_faculty: int

    class Config:
        from_attributes = True