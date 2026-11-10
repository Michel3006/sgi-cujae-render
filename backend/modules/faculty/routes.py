# faculty/routes.py
from fastapi import APIRouter, Depends, HTTPException
from modules.auth.dependencies import require_authenticated, require_admin
from sqlalchemy.orm import Session
from typing import List
from database import SessionLocal
from . import crud, schemas

router = APIRouter(
    prefix="/faculty",
    tags=["faculty"],
    dependencies=[Depends(require_authenticated)],
)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.Faculty])
def read_faculties(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    faculties = crud.get_faculties(db, skip=skip, limit=limit)
    return faculties

@router.get("/{faculty_id}", response_model=schemas.Faculty)
def read_faculty(faculty_id: int, db: Session = Depends(get_db)):
    db_faculty = crud.get_faculty(db, faculty_id)
    if db_faculty is None:
        raise HTTPException(status_code=404, detail="Facultad no encontrada")
    return db_faculty

@router.post("/", response_model=schemas.Faculty, dependencies=[Depends(require_admin)])
def create_faculty(faculty: schemas.FacultyCreate, db: Session = Depends(get_db)):
    return crud.create_faculty(db=db, faculty=faculty)

@router.put("/{faculty_id}", response_model=schemas.Faculty, dependencies=[Depends(require_admin)])
def update_faculty(faculty_id: int, faculty: schemas.FacultyUpdate, db: Session = Depends(get_db)):
    db_faculty = crud.update_faculty(db, faculty_id, faculty)
    if db_faculty is None:
        raise HTTPException(status_code=404, detail="Facultad no encontrada")
    return db_faculty

@router.delete("/{faculty_id}", response_model=schemas.Faculty, dependencies=[Depends(require_admin)])
def delete_faculty(faculty_id: int, db: Session = Depends(get_db)):
    db_faculty = crud.delete_faculty(db, faculty_id)
    if db_faculty is None:
        raise HTTPException(status_code=404, detail="Facultad no encontrada")
    return db_faculty