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
    prefix="/norm-types",
    tags=["norm-types"]
)

@router.get("/", response_model=List[schemas.NormType])
def read_norm_types(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_norm_types(db, skip=skip, limit=limit)

@router.get("/{type_id}", response_model=schemas.NormType)
def read_norm_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.get_norm_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Norm type not found")
    return db_type

@router.post("/", response_model=schemas.NormType)
def create_norm_type(norm_type: schemas.NormTypeCreate, db: Session = Depends(get_db)):
    return crud.create_norm_type(db=db, norm_type=norm_type)

@router.put("/{type_id}", response_model=schemas.NormType)
def update_norm_type(type_id: int, norm_type: schemas.NormTypeUpdate, db: Session = Depends(get_db)):
    db_type = crud.update_norm_type(db, type_id, norm_type)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Norm type not found")
    return db_type

@router.delete("/{type_id}", response_model=schemas.NormType)
def delete_norm_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.delete_norm_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Norm type not found")
    return db_type