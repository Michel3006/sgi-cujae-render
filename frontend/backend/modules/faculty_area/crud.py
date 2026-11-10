# faculties_areas/crud.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from . import models, schemas
from modules.faculty.crud import get_faculty  # Validamos que la facultad exista

def get_faculty_area(db: Session, area_id: int):
    return db.query(models.FacultyArea).filter(models.FacultyArea.id_faculty_area == area_id).first()

def get_faculty_areas(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.FacultyArea).offset(skip).limit(limit).all()

def create_faculty_area(db: Session, area: schemas.FacultyAreaCreate):
    # Validar que la facultad exista
    if not get_faculty(db, area.id_faculty):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Faculty with id {area.id_faculty} does not exist"
        )
    db_area = models.FacultyArea(name=area.name, id_faculty=area.id_faculty)
    db.add(db_area)
    db.commit()
    db.refresh(db_area)
    return db_area

def update_faculty_area(db: Session, area_id: int, area_update: schemas.FacultyAreaUpdate):
    db_area = get_faculty_area(db, area_id)
    if not db_area:
        return None

    update_data = area_update.model_dump(exclude_unset=True)
    
    # Si se está actualizando id_faculty, validar que exista
    if "id_faculty" in update_data and update_data["id_faculty"] is not None:
        if not get_faculty(db, update_data["id_faculty"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Faculty with id {update_data['id_faculty']} does not exist"
            )

    for key, value in update_data.items():
        setattr(db_area, key, value)

    db.commit()
    db.refresh(db_area)
    return db_area

def delete_faculty_area(db: Session, area_id: int):
    db_area = get_faculty_area(db, area_id)
    if not db_area:
        return None