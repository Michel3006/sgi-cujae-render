# countries/schemas.py
from pydantic import BaseModel
from typing import Optional

class CountryBase(BaseModel):
    name: Optional[str] = None
    capital: Optional[str] = None
    code: Optional[str] = None

class CountryCreate(CountryBase):
    name: str
    capital: str
    code: str

class CountryUpdate(CountryBase):
    pass

class Country(CountryBase):
    id_country: int

    class Config:
        from_attributes = True  # Reemplaza orm_mode en Pydantic v2