# cientific_degree/crud.py
from sqlalchemy.orm import Session
from . import models, schemas

def get_cientific_degree(db: Session, degree_id: int):
    return db.query(models.CientificDegree).filter(models.CientificDegree.id_cientific_degree == degree_id).first()

def get_cientific_degrees(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.CientificDegree).offset(skip).limit(limit).all()

def create_cientific_degree(db: Session, degree: schemas.CientificDegreeCreate):
    db_degree = models.CientificDegree(name=degree.name)
    db.add(db_degree)
    db.commit()
    db.refresh(db_degree)
    return db_degree

def update_cientific_degree(db: Session, degree_id: int, degree_update: schemas.CientificDegreeUpdate):
    db_degree = get_cientific_degree(db, degree_id)
    if not db_degree:
        return None
    update_data = degree_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_degree, key, value)
    db.commit()
    db.refresh(db_degree)
    return db_degree

def delete_cientific_degree(db: Session, degree_id: int):
    db_degree = get_cientific_degree(db, degree_id)
    if not db_degree:
        return None
    db.delete(db_degree)
    db.commit()
    return db_degree