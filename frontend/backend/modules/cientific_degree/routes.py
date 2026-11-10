# cientific_degree/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import SessionLocal  # 👈 Importamos SessionLocal
from . import crud, schemas

# Definimos get_db localmente
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(
    prefix="/cientific-degrees",
    tags=["cientific-degrees"]
)

@router.get("/", response_model=List[schemas.CientificDegree])
def read_cientific_degrees(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    degrees = crud.get_cientific_degrees(db, skip=skip, limit=limit)
    return degrees

@router.get("/{degree_id}", response_model=schemas.CientificDegree)
def read_cientific_degree(degree_id: int, db: Session = Depends(get_db)):
    db_degree = crud.get_cientific_degree(db, degree_id)
    if db_degree is None:
        raise HTTPException(status_code=404, detail="Cientific degree not found")
    return db_degree

@router.post("/", response_model=schemas.CientificDegree)
def create_cientific_degree(degree: schemas.CientificDegreeCreate, db: Session = Depends(get_db)):
    return crud.create_cientific_degree(db=db, degree=degree)

@router.put("/{degree_id}", response_model=schemas.CientificDegree)
def update_cientific_degree(degree_id: int, degree: schemas.CientificDegreeUpdate, db: Session = Depends(get_db)):
    db_degree = crud.update_cientific_degree(db, degree_id, degree)
    if db_degree is None:
        raise HTTPException(status_code=404, detail="Cientific degree not found")
    return db_degree

@router.delete("/{degree_id}", response_model=schemas.CientificDegree)
def delete_cientific_degree(degree_id: int, db: Session = Depends(get_db)):
    db_degree = crud.delete_cientific_degree(db, degree_id)
    if db_degree is None:
        raise HTTPException(status_code=404, detail="Cientific degree not found")
    return db_degree