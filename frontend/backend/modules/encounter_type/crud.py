from sqlalchemy.orm import Session
from . import models, schemas

def get_encounter_type(db: Session, type_id: int):
    return db.query(models.EncounterType).filter(models.EncounterType.id_encounter_type == type_id).first()

def get_encounter_types(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.EncounterType).offset(skip).limit(limit).all()

def create_encounter_type(db: Session, encounter_type: schemas.EncounterTypeCreate):
    db_type = models.EncounterType(**encounter_type.model_dump())
    db.add(db_type)
    db.commit()
    db.refresh(db_type)
    return db_type

def update_encounter_type(db: Session, type_id: int, encounter_type_update: schemas.EncounterTypeUpdate):
    db_type = get_encounter_type(db, type_id)
    if not db_type:
        return None
    for key, value in encounter_type_update.model_dump(exclude_unset=True).items():
        setattr(db_type, key, value)
    db.commit()
    db.refresh(db_type)
    return db_type

def delete_encounter_type(db: Session, type_id: int):
    db_type = get_encounter_type(db, type_id)
    if not db_type:
        return None
    db.delete(db_type)
    db.commit()
    return db_type