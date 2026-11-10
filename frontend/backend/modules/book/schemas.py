# books/schemas.py
from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import date

# Esquema mínimo de autor (solo lo básico que quieres exponer)
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

class BookBase(BaseModel):
    title: str
    chapter_title: str
    editor: Optional[str] = None
    voulume: Optional[str] = None
    number: Optional[str] = None
    series: Optional[str] = None
    pages: Optional[str] = None
    publisher: Optional[str] = None
    keywords: Optional[str] = None
    resume: Optional[str] = None
    isbn: Optional[str] = None
    report_date: Optional[date] = None
    id_country: Optional[int] = None
    is_chapter: bool = False
    month_only: int = 1
    year_only: int = 2009
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: bool = False

class BookCreate(BookBase):
    author_ids: List[Union[int, NewAuthor]]

class BookUpdate(BaseModel):
    title: Optional[str] = None
    chapter_title: Optional[str] = None
    editor: Optional[str] = None
    voulume: Optional[str] = None
    number: Optional[str] = None
    series: Optional[str] = None
    pages: Optional[str] = None
    publisher: Optional[str] = None
    keywords: Optional[str] = None
    resume: Optional[str] = None
    isbn: Optional[str] = None
    report_date: Optional[date] = None
    id_country: Optional[int] = None
    is_chapter: Optional[bool] = None
    month_only: Optional[int] = None
    year_only: Optional[int] = None
    id_project: Optional[int] = None
    only_date: Optional[date] = None
    id_group: Optional[int] = None
    publicated: Optional[bool] = None
    author_ids: Optional[List[int]] = None  # Para reemplazar autores

class Book(BookBase):
    id_book: int
    authors: List[AuthorSummary] = []

    class Config:
        from_attributes = True

# modules/books/schemas.py
from pydantic import BaseModel

class BookCountByFaculty(BaseModel):
    total_books: int
    books_in_faculty: int