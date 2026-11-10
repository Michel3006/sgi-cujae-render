# theses_types/crud.py
from sqlalchemy.orm import Session
from . import models, schemas

def get_thesis_type(db: Session, type_id: int):
    return db.query(models.ThesisType).filter(models.ThesisType.id_thesis_type == type_id).first()

def get_thesis_types(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.ThesisType).offset(skip).limit(limit).all()

def create_thesis_type(db: Session, thesis_type: schemas.ThesisTypeCreate):
    db_type = models.ThesisType(**thesis_type.model_dump())
    db.add(db_type)
    db.commit()
    db.refresh(db_type)
    return db_type

def update_thesis_type(db: Session, type_id: int, thesis_type_update: schemas.ThesisTypeUpdate):
    db_type = get_thesis_type(db, type_id)
    if not db_type:
        return None
    for key, value in thesis_type_update.model_dump(exclude_unset=True).items():
        setattr(db_type, key, value)
    db.commit()
    db.refresh(db_type)
    return db_type

def delete_thesis_type(db: Session, type_id: int):
    db_type = get_thesis_type(db, type_id)
    if not db_type:
        return None
    db.delete(db_type)
    db.commit()
    return db_type