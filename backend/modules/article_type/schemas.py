from pydantic import BaseModel
from typing import Optional

class ArticleTypeBase(BaseModel):
    name: Optional[str] = None

class ArticleTypeCreate(ArticleTypeBase):
    pass

class ArticleTypeUpdate(BaseModel):
    name: Optional[str] = None

class ArticleType(ArticleTypeBase):
    id_article_type: int

    class Config:
        from_attributes = True