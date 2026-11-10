from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import date

class NewAuthor(BaseModel):
    name: str
    work_center: str
    email: str
    id_country: int  # Asumimos que el país ya existe en la base de datos
# Esquemas anidados
class CountrySummary(BaseModel):
    id_country: int
    name: str
    class Config:
        from_attributes = True

class ArticleTypeSummary(BaseModel):
    id_article_type: int
    name: Optional[str] = None
    class Config:
        from_attributes = True

class AuthorSummary(BaseModel):
    id_integrant: int
    name: str
    email: Optional[str] = None
    class Config:
        from_attributes = True

# Esquema base
class ArticleBase(BaseModel):
    title: str
    journal: str
    voulume: str
    pages: str
    number: Optional[str] = None
    keywords: Optional[str] = None
    doi: Optional[str] = None
    resume: Optional[str] = None
    id_article_type: Optional[int] = None
    report_date: Optional[date] = None
    issn: Optional[str] = None
    id_country: Optional[int] = None
    month_only: int = 1
    year_only: int = 2009
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    published: bool = True
    publicated: bool = False

class ArticleCreate(ArticleBase):
    author_ids: List[Union[int, NewAuthor]]

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    journal: Optional[str] = None
    voulume: Optional[str] = None
    pages: Optional[str] = None
    number: Optional[str] = None
    keywords: Optional[str] = None
    doi: Optional[str] = None
    resume: Optional[str] = None
    id_article_type: Optional[int] = None
    report_date: Optional[date] = None
    issn: Optional[str] = None
    id_country: Optional[int] = None
    month_only: Optional[int] = None
    year_only: Optional[int] = None
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    published: Optional[bool] = None
    publicated: Optional[bool] = None
    author_ids: Optional[List[int]] = None

class Article(ArticleBase):
    id_article: int
    country: Optional[CountrySummary] = None
    article_type: Optional[ArticleTypeSummary] = None
    authors: List[AuthorSummary] = []

    class Config:
        from_attributes = True

# modules/article/schemas.py

class ArticleCountByFaculty(BaseModel):
    total_articles: int
    articles_in_faculty: int