# theses/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
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
    prefix="/theses",
    tags=["theses"]
)

@router.get("/", response_model=List[schemas.Thesis])
def read_theses(
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = Query(None, description="Filter theses by author ID"),
    tutor_id: Optional[int] = Query(None, description="Filter theses by tutor ID"),
    search: Optional[str] = Query(None, description="Search term in any text field (title, institution, keywords, etc.)"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_theses(db, skip=skip, limit=limit, author_id=author_id, tutor_id=tutor_id, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{thesis_id}", response_model=schemas.Thesis)
def read_thesis(thesis_id: int, db: Session = Depends(get_db)):
    db_thesis = crud.get_thesis(db, thesis_id)
    if db_thesis is None:
        raise HTTPException(status_code=404, detail="Thesis not found")
    return db_thesis

@router.post("/", response_model=schemas.Thesis)
def create_thesis(thesis: schemas.ThesisCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_thesis(db=db, thesis=thesis)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{thesis_id}", response_model=schemas.Thesis)
def update_thesis(thesis_id: int, thesis: schemas.ThesisUpdate, db: Session = Depends(get_db)):
    try:
        db_thesis = crud.update_thesis(db, thesis_id, thesis)
        if db_thesis is None:
            raise HTTPException(status_code=404, detail="Thesis not found")
        return db_thesis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{thesis_id}", response_model=schemas.Thesis)
def delete_thesis(thesis_id: int, db: Session = Depends(get_db)):
    db_thesis = crud.delete_thesis(db, thesis_id)
    if db_thesis is None:
        raise HTTPException(status_code=404, detail="Thesis not found")
    return db_thesis

@router.get("/count/{faculty_id}", response_model=schemas.ThesisCountByFaculty)
def get_thesis_count_by_faculty_endpoint(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    """
    Devuelve el conteo total de tesis y las que tienen al menos un autor 
    o tutor perteneciente a la facultad especificada.
    """
    try:
        result = crud.get_thesis_count_by_faculty(db, faculty_id)
        return result
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=500,
            detail="Error al obtener los conteos de tesis por facultad"
        )