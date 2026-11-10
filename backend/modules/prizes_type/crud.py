# prizes_types/crud.py
from sqlalchemy.orm import Session
from . import models, schemas

def get_prize_type(db: Session, type_id: int):
    return db.query(models.PrizeType).filter(models.PrizeType.id_prize_type == type_id).first()

def get_prize_types(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.PrizeType).offset(skip).limit(limit).all()

def create_prize_type(db: Session, prize_type: schemas.PrizeTypeCreate):
    db_type = models.PrizeType(**prize_type.model_dump())
    db.add(db_type)
    db.commit()
    db.refresh(db_type)
    return db_type

def update_prize_type(db: Session, type_id: int, prize_type_update: schemas.PrizeTypeUpdate):
    db_type = get_prize_type(db, type_id)
    if not db_type:
        return None
    for key, value in prize_type_update.model_dump(exclude_unset=True).items():
        setattr(db_type, key, value)
    db.commit()
    db.refresh(db_type)
    return db_type

def delete_prize_type(db: Session, type_id: int):
    db_type = get_prize_type(db, type_id)
    if not db_type:
        return None
    db.delete(db_type)
    db.commit()
    return db_type