# general_category/schemas.py
from pydantic import BaseModel
from typing import Optional

class GeneralCategoryBase(BaseModel):
    name: str

class GeneralCategoryCreate(GeneralCategoryBase):
    pass

class GeneralCategoryUpdate(BaseModel):
    name: Optional[str] = None

class GeneralCategory(GeneralCategoryBase):
    id_general_category: int

    class Config:
        from_attributes = True