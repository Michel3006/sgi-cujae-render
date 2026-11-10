# general_category/routes.py
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
    prefix="/general-categories",
    tags=["general-categories"]
)

@router.get("/", response_model=List[schemas.GeneralCategory])
def read_general_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    categories = crud.get_general_categories(db, skip=skip, limit=limit)
    return categories

@router.get("/{category_id}", response_model=schemas.GeneralCategory)
def read_general_category(category_id: int, db: Session = Depends(get_db)):
    db_category = crud.get_general_category(db, category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="General category not found")
    return db_category

@router.post("/", response_model=schemas.GeneralCategory)
def create_general_category(category: schemas.GeneralCategoryCreate, db: Session = Depends(get_db)):
    return crud.create_general_category(db=db, category=category)

@router.put("/{category_id}", response_model=schemas.GeneralCategory)
def update_general_category(category_id: int, category: schemas.GeneralCategoryUpdate, db: Session = Depends(get_db)):
    db_category = crud.update_general_category(db, category_id, category)
    if db_category is None:
        raise HTTPException(status_code=404, detail="General category not found")
    return db_category

@router.delete("/{category_id}", response_model=schemas.GeneralCategory)
def delete_general_category(category_id: int, db: Session = Depends(get_db)):
    db_category = crud.delete_general_category(db, category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="General category not found")
    return db_category