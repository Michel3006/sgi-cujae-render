# faculties_areas/routes.py
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
    prefix="/faculty-areas",
    tags=["faculty-areas"]
)

@router.get("/", response_model=List[schemas.FacultyArea])
def read_faculty_areas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_faculty_areas(db, skip=skip, limit=limit)

@router.get("/{area_id}", response_model=schemas.FacultyArea)
def read_faculty_area(area_id: int, db: Session = Depends(get_db)):
    db_area = crud.get_faculty_area(db, area_id)
    if db_area is None:
        raise HTTPException(status_code=404, detail="Faculty area not found")
    return db_area

@router.post("/", response_model=schemas.FacultyArea)
def create_faculty_area(area: schemas.FacultyAreaCreate, db: Session = Depends(get_db)):
    return crud.create_faculty_area(db=db, area=area)

@router.put("/{area_id}", response_model=schemas.FacultyArea)
def update_faculty_area(area_id: int, area: schemas.FacultyAreaUpdate, db: Session = Depends(get_db)):
    db_area = crud.update_faculty_area(db, area_id, area)
    if db_area is None:
        raise HTTPException(status_code=404, detail="Faculty area not found")
    return db_area

@router.delete("/{area_id}", response_model=schemas.FacultyArea)
def delete_faculty_area(area_id: int, db: Session = Depends(get_db)):
    db_area = crud.delete_faculty_area(db, area_id)
    if db_area is None:
        raise HTTPException(status_code=404, detail="Faculty area not found")
    return db_area