# books/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query ,status
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
    tags=["books"]
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
        raise HTTPException(status_code=404, detail="Book not found")
    return db_book

@router.post("/", response_model=schemas.Book)
def create_book(book: schemas.BookCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_book(db=db, book=book)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as h:
        raise h
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{book_id}", response_model=schemas.Book)
def update_book(book_id: int, book: schemas.BookUpdate, db: Session = Depends(get_db)):
    try:
        db_book = crud.update_book(db, book_id, book)
        if db_book is None:
            raise HTTPException(status_code=404, detail="Book not found")
        return db_book
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{book_id}", response_model=schemas.Book)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    db_book = crud.delete_book(db, book_id)
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return db_book


@router.get("/count/faculty/{faculty_id}", response_model=schemas.BookCountByFaculty)
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