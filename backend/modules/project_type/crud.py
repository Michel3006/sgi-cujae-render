# project_type/crud.py
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas

def get_project_type(db: Session, type_id: int):
    return db.query(models.ProjectType).filter(models.ProjectType.id_project_type == type_id).first()

def get_project_types(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    query = db.query(models.ProjectType)
    
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.ProjectType.name.ilike(term),
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_project_type(db: Session, project_type: schemas.ProjectTypeCreate):
    db_type = models.ProjectType(**project_type.model_dump())
    db.add(db_type)
    db.commit()
    db.refresh(db_type)
    return db_type

def update_project_type(db: Session, type_id: int, project_type_update: schemas.ProjectTypeUpdate):
    db_type = get_project_type(db, type_id)
    if not db_type:
        return None
    for key, value in project_type_update.model_dump(exclude_unset=True).items():
        setattr(db_type, key, value)
    db.commit()
    db.refresh(db_type)
    return db_type

def delete_project_type(db: Session, type_id: int):
    db_type = get_project_type(db, type_id)
    if not db_type:
        return None
    db.delete(db_type)
    db.commit()
    return db_type