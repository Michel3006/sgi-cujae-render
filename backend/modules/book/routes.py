# books/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query ,status
from modules.auth.dependencies import require_authenticated, require_scientific_write, require_stats_view
from sqlalchemy.orm import Session  
from typing import List, Optional
from database import SessionLocal
from . import crud, schemas

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(
    prefix="/books",
    tags=["books"],
    dependencies=[Depends(require_authenticated)],
)

@router.get("/", response_model=List[schemas.Book])
def read_books(
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = Query(None, description="Filter books by author ID (integrant ID)"),
    search: Optional[str] = Query(None, description="Search term in any text field (title, editor, keywords, etc.)"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_books(db, skip=skip, limit=limit, author_id=author_id, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/{book_id}", response_model=schemas.Book)
def read_book(book_id: int, db: Session = Depends(get_db)):
    db_book = crud.get_book(db, book_id)
    if db_book is None:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return db_book

@router.post("/", response_model=schemas.Book, dependencies=[Depends(require_scientific_write)])
def create_book(book: schemas.BookCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_book(db=db, book=book)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as h:
        raise h
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/{book_id}", response_model=schemas.Book, dependencies=[Depends(require_scientific_write)])
def update_book(book_id: int, book: schemas.BookUpdate, db: Session = Depends(get_db)):
    try:
        db_book = crud.update_book(db, book_id, book)
        if db_book is None:
            raise HTTPException(status_code=404, detail="Libro no encontrado")
        return db_book
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{book_id}", response_model=schemas.Book, dependencies=[Depends(require_scientific_write)])
def delete_book(book_id: int, db: Session = Depends(get_db)):
    db_book = crud.delete_book(db, book_id)
    if db_book is None:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return db_book


@router.get("/count/faculty/{faculty_id}", response_model=schemas.BookCountByFaculty, dependencies=[Depends(require_stats_view)])
def get_book_count_by_faculty_endpoint(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene el total de libros y la cantidad asociada a una facultad (vía autores).
    """
    try:
        return crud.get_book_count_by_faculty(db, faculty_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al contar libros: {str(e)}")