from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import date

class CountrySummary(BaseModel):
    id_country: int
    name: str
    class Config:
        from_attributes = True

class EncounterTypeSummary(BaseModel):
    id_encounter_type: int
    name: Optional[str] = None
    class Config:
        from_attributes = True

class NewAuthor(BaseModel):
    name: str
    work_center: str
    email: str
    id_country: int

class AuthorSummary(BaseModel):
    id_integrant: int
    name: str
    email: Optional[str] = None
    class Config:
        from_attributes = True

class EncounterBase(BaseModel):
    title: str
    encounter_name: str
    keywords: Optional[str] = None
    resume: Optional[str] = None
    id_encounter_type: Optional[int] = None
    report_date: Optional[date] = None
    isbn: Optional[str] = None
    city: Optional[str] = None
    issn: Optional[str] = None
    organizer: Optional[str] = None
    id_country: Optional[int] = None
    month_only: int = 1
    year_only: int = 2009
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: bool = False

class EncounterCreate(EncounterBase):
    author_ids: List[Union[int, NewAuthor]]
class EncounterUpdate(BaseModel):
    title: Optional[str] = None
    encounter_name: Optional[str] = None
    keywords: Optional[str] = None
    resume: Optional[str] = None
    id_encounter_type: Optional[int] = None
    report_date: Optional[date] = None
    isbn: Optional[str] = None
    city: Optional[str] = None
    issn: Optional[str] = None
    organizer: Optional[str] = None
    id_country: Optional[int] = None
    month_only: Optional[int] = None
    year_only: Optional[int] = None
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: Optional[bool] = None
    author_ids: Optional[List[int]] = None

class Encounter(EncounterBase):
    id_encounter: int
    country: Optional[CountrySummary] = None
    encounter_type: Optional[EncounterTypeSummary] = None
    authors: List[AuthorSummary] = []

    class Config:
        from_attributes = True

# modules/encounters/schemas.py
from pydantic import BaseModel

class EncounterCountByFaculty(BaseModel):
    total_encounters: int
    encounters_in_faculty: int