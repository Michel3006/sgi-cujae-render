from sqlalchemy.orm import Session
from . import models, schemas

def get_norm_type(db: Session, type_id: int):
    return db.query(models.NormType).filter(models.NormType.id_norm_type == type_id).first()

def get_norm_types(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.NormType).offset(skip).limit(limit).all()

def create_norm_type(db: Session, norm_type: schemas.NormTypeCreate):
    db_type = models.NormType(**norm_type.model_dump())
    db.add(db_type)
    db.commit()
    db.refresh(db_type)
    return db_type

def update_norm_type(db: Session, type_id: int, norm_type_update: schemas.NormTypeUpdate):
    db_type = get_norm_type(db, type_id)
    if not db_type:
        return None
    for key, value in norm_type_update.model_dump(exclude_unset=True).items():
        setattr(db_type, key, value)
    db.commit()
    db.refresh(db_type)
    return db_type

def delete_norm_type(db: Session, type_id: int):
    db_type = get_norm_type(db, type_id)
    if not db_type:
        return None
    db.delete(db_type)
    db.commit()
    return db_type