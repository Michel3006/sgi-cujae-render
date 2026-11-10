# books/crud.py
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from . import models, schemas
from modules.country.crud import get_country
from sqlalchemy.orm import joinedload
from modules.integrant.models import Integrant  # Asumimos que existe

def get_book(db: Session, book_id: int):
    return db.query(models.Book).options(
        joinedload(models.Book.country)
    ).filter(models.Book.id_book == book_id).first()

def get_books(db: Session, skip: int = 0, limit: int = 100, author_id: Optional[int] = None, search: Optional[str] = None):
    query = db.query(models.Book)
    
    if author_id is not None:
        query = query.join(models.Book.authors).filter(Integrant.id_integrant == author_id)
    
    if search:
        search = f"%{search}%"
        query = query.filter(
            or_(
                models.Book.title.ilike(search),
                models.Book.chapter_title.ilike(search),
                models.Book.editor.ilike(search),
                models.Book.voulume.ilike(search),
                models.Book.number.ilike(search),
                models.Book.series.ilike(search),
                models.Book.pages.ilike(search),
                models.Book.publisher.ilike(search),
                models.Book.keywords.ilike(search),
                models.Book.resume.ilike(search),
                models.Book.isbn.ilike(search)
            )
        )
    
    return query.offset(skip).limit(limit).all()

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

def create_book(db: Session, book: schemas.BookCreate):
    # 🔍 Validar unicidad del ISBN (si se proporciona)
    if book.isbn and book.isbn.strip():
        existing_book = db.query(models.Book).filter(
            models.Book.isbn == book.isbn.strip()
        ).first()
        if existing_book:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A book with this ISBN already exists"
            )

    # Validar país del libro
    if book.id_country and not get_country(db, book.id_country):
        raise ValueError(f"Country with id {book.id_country} does not exist")

    # Procesar autores: separar existentes y nuevos
    author_ids_to_associate = []
    existing_author_ids = []
    new_authors_data = []

    for author in book.author_ids:
        if isinstance(author, int):
            existing_author_ids.append(author)
        elif isinstance(author, schemas.NewAuthor):
            new_authors_data.append(author)
        else:
            raise ValueError("Invalid entry in author_ids: must be int or NewAuthor")

    # Validar autores existentes
    if existing_author_ids:
        existing_authors = db.query(Integrant).filter(
            Integrant.id_integrant.in_(existing_author_ids)
        ).all()
        if len(existing_authors) != len(existing_author_ids):
            raise ValueError("One or more existing author IDs do not exist")

    # Validar países de los autores nuevos
    new_country_ids = {a.id_country for a in new_authors_data}
    for country_id in new_country_ids:
        if not get_country(db, country_id):
            raise ValueError(f"Country with id {country_id} does not exist")

    # Crear el libro
    book_data = book.model_dump(exclude={"author_ids"})
    db_book = models.Book(**book_data)
    db.add(db_book)
    db.flush()  # Obtiene id_book

    # Crear autores nuevos y recolectar sus IDs
    for new_author in new_authors_data:
        db_new_author = Integrant(
            name=new_author.name,
            work_center=new_author.work_center,
            email=new_author.email,
            id_country=new_author.id_country,
            external=True  # asumimos que son externos
        )
        db.add(db_new_author)
        db.flush()  # necesario para obtener el id_integrant
        author_ids_to_associate.append(db_new_author.id_integrant)

    # Añadir IDs de autores existentes
    author_ids_to_associate.extend(existing_author_ids)

    # Asociar todos los autores al libro
    for author_id in author_ids_to_associate:
        db.execute(
            models.books_authors.insert().values(
                id_book=db_book.id_book,
                id_author=author_id
            )
        )

    db.commit()
    db.refresh(db_book)
    return db_book

def update_book(db: Session, book_id: int, book_update: schemas.BookUpdate):
    db_book = get_book(db, book_id)
    if not db_book:
        return None

    update_data = book_update.model_dump(exclude_unset=True)

    # Validar país
    if "id_country" in update_data and update_data["id_country"] is not None:
        if not get_country(db, update_data["id_country"]):
            raise ValueError(f"Country with id {update_data['id_country']} does not exist")

    # Actualizar campos simples
    for key, value in update_data.items():
        if key != "author_ids":
            setattr(db_book, key, value)

    # Actualizar autores si se proporcionan
    if "author_ids" in update_data and update_data["author_ids"] is not None:
        # Eliminar relaciones actuales
        db.execute(
            models.books_authors.delete().where(models.books_authors.c.id_book == book_id)
        )
        # Validar autores
        author_ids = update_data["author_ids"]
        existing_authors = db.query(Integrant).filter(Integrant.id_integrant.in_(author_ids)).all()
        if len(existing_authors) != len(author_ids):
            raise ValueError("One or more author IDs do not exist")
        # Insertar nuevas relaciones
        for author_id in author_ids:
            db.execute(
                models.books_authors.insert().values(
                    id_book=book_id,
                    id_author=author_id
                )
            )

    db.commit()
    db.refresh(db_book)
    return db_book

def delete_book(db: Session, book_id: int):
    db_book = get_book(db, book_id)
    if not db_book:
        return None
    # Eliminar relaciones en books_authors
    db.execute(
        models.books_authors.delete().where(models.books_authors.c.id_book == book_id)
    )
    db.delete(db_book)
    db.commit()
    return db_book

# modules/books/crud.py
from typing import Dict
from sqlalchemy.orm import Session
from . import models

def get_book_count_by_faculty(db: Session, faculty_id: int) -> Dict[str, int]:
    """
    Cuenta:
      - total_books: todos los libros
      - books_in_faculty: libros con al menos un autor de la facultad dada
    """
    # Total de libros
    total_books = db.query(models.Book).count()

    # Libros con al menos un autor de la facultad especificada
    books_in_faculty = (
        db.query(models.Book)
        .join(models.books_authors)  # Book → books_authors
        .join(Integrant, models.books_authors.c.id_author == Integrant.id_integrant)  # → Integrant
        .filter(Integrant.id_faculty == faculty_id)
        .distinct()
        .count()
    )

    return {
        "total_books": total_books,
        "books_in_faculty": books_in_faculty
    }