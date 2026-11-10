# docent_degree/routes.py
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
    prefix="/docent-degrees",
    tags=["docent-degrees"]
)

@router.get("/", response_model=List[schemas.DocentDegree])
def read_docent_degrees(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    degrees = crud.get_docent_degrees(db, skip=skip, limit=limit)
    return degrees

@router.get("/{degree_id}", response_model=schemas.DocentDegree)
def read_docent_degree(degree_id: int, db: Session = Depends(get_db)):
    db_degree = crud.get_docent_degree(db, degree_id)
    if db_degree is None:
        raise HTTPException(status_code=404, detail="Docent degree not found")
    return db_degree

@router.post("/", response_model=schemas.DocentDegree)
def create_docent_degree(degree: schemas.DocentDegreeCreate, db: Session = Depends(get_db)):
    return crud.create_docent_degree(db=db, degree=degree)

@router.put("/{degree_id}", response_model=schemas.DocentDegree)
def update_docent_degree(degree_id: int, degree: schemas.DocentDegreeUpdate, db: Session = Depends(get_db)):
    db_degree = crud.update_docent_degree(db, degree_id, degree)
    if db_degree is None:
        raise HTTPException(status_code=404, detail="Docent degree not found")
    return db_degree

@router.delete("/{degree_id}", response_model=schemas.DocentDegree)
def delete_docent_degree(degree_id: int, db: Session = Depends(get_db)):
    db_degree = crud.delete_docent_degree(db, degree_id)
    if db_degree is None:
        raise HTTPException(status_code=404, detail="Docent degree not found")
    return db_degree