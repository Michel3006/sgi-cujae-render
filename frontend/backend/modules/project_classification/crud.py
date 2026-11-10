# project_classification/crud.py
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas

def get_project_classification(db: Session, classification_id: int):
    return db.query(models.ProjectClassification).filter(models.ProjectClassification.id_project_classification == classification_id).first()

def get_project_classifications(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    query = db.query(models.ProjectClassification)
    
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.ProjectClassification.name.ilike(term),
                models.ProjectClassification.code.ilike(term)
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_project_classification(db: Session, classification: schemas.ProjectClassificationCreate):
    db_classification = models.ProjectClassification(**classification.model_dump())
    db.add(db_classification)
    db.commit()
    db.refresh(db_classification)
    return db_classification

def update_project_classification(db: Session, classification_id: int, classification_update: schemas.ProjectClassificationUpdate):
    db_classification = get_project_classification(db, classification_id)
    if not db_classification:
        return None
    for key, value in classification_update.model_dump(exclude_unset=True).items():
        setattr(db_classification, key, value)
    db.commit()
    db.refresh(db_classification)
    return db_classification

def delete_project_classification(db: Session, classification_id: int):
    db_classification = get_project_classification(db, classification_id)
    if not db_classification:
        return None
    db.delete(db_classification)
    db.commit()
    return db_classification