# books/models.py
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base
# Ya debe existir

class Book(Base):
    __tablename__ = "books"

    id_book = Column(Integer, primary_key=True, index=True, server_default="nextval('books_id_book_seq')")
    title = Column(String, nullable=False)
    chapter_title = Column(String, nullable=False)
    editor = Column(String)
    voulume = Column(String)  # Nota: probable typo ("volume"), pero respetamos la BD
    number = Column(String)
    series = Column(String)
    pages = Column(String)
    publisher = Column(String)
    keywords = Column(String)
    resume = Column(String)
    isbn = Column(String)
    report_date = Column(Date)
    id_country = Column(Integer, ForeignKey("countries.id_country"))
    is_chapter = Column(Boolean, default=False, nullable=False)
    month_only = Column(Integer, default=1, nullable=False)
    year_only = Column(Integer, default=2009, nullable=False)
    id_project = Column(Integer)
    only_date = Column(Date)
    id_group = Column(Integer)
    publicated = Column(Boolean, default=False, nullable=False)

    # Relación con país (opcional, pero útil)
    country = relationship("Country", foreign_keys=[id_country])

    # Relación muchos a muchos con autores (integrants)
    authors = relationship(
        "Integrant",
        secondary="books_authors",
        back_populates="books"
    )

# Tabla intermedia (solo si quieres manipularla directamente; no es obligatorio si usas relationship)
books_authors = Table(
    "books_authors",
    Base.metadata,
    Column(
        "id_book_author",
        Integer,
        primary_key=True,
        server_default="nextval('books_authors_id_book_author_seq')"
    ),
    Column("id_book", Integer, ForeignKey("books.id_book")),
    Column("id_author", Integer, ForeignKey("integrant.id_integrant"))
)