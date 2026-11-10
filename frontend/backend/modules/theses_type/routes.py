# theses_types/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import SessionLocal
from . import crud, schemas

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(
    prefix="/thesis-types",
    tags=["thesis-types"]
)

@router.get("/", response_model=List[schemas.ThesisType])
def read_thesis_types(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_thesis_types(db, skip=skip, limit=limit)

@router.get("/{type_id}", response_model=schemas.ThesisType)
def read_thesis_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.get_thesis_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Thesis type not found")
    return db_type

@router.post("/", response_model=schemas.ThesisType)
def create_thesis_type(thesis_type: schemas.ThesisTypeCreate, db: Session = Depends(get_db)):
    return crud.create_thesis_type(db=db, thesis_type=thesis_type)

@router.put("/{type_id}", response_model=schemas.ThesisType)
def update_thesis_type(type_id: int, thesis_type: schemas.ThesisTypeUpdate, db: Session = Depends(get_db)):
    db_type = crud.update_thesis_type(db, type_id, thesis_type)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Thesis type not found")
    return db_type

@router.delete("/{type_id}", response_model=schemas.ThesisType)
def delete_thesis_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.delete_thesis_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Thesis type not found")
    return db_type