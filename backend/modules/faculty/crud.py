# faculty/crud.py
from sqlalchemy.orm import Session
from . import models, schemas

def get_faculty(db: Session, faculty_id: int):
    return db.query(models.Faculty).filter(models.Faculty.id_faculty == faculty_id).first()

def get_faculties(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Faculty).offset(skip).limit(limit).all()

def create_faculty(db: Session, faculty: schemas.FacultyCreate):
    db_faculty = models.Faculty(name=faculty.name, fullname=faculty.fullname)
    db.add(db_faculty)
    db.commit()
    db.refresh(db_faculty)
    return db_faculty

def update_faculty(db: Session, faculty_id: int, faculty_update: schemas.FacultyUpdate):
    db_faculty = get_faculty(db, faculty_id)
    if not db_faculty:
        return None
    update_data = faculty_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_faculty, key, value)
    db.commit()
    db.refresh(db_faculty)
    return db_faculty

def delete_faculty(db: Session, faculty_id: int):
    db_faculty = get_faculty(db, faculty_id)
    if not db_faculty:
        return None
    db.delete(db_faculty)
    db.commit()
    return db_faculty