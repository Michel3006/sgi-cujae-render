# project_state/crud.py
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas

def get_project_state(db: Session, state_id: int):
    return db.query(models.ProjectState).filter(models.ProjectState.id_project_state == state_id).first()

def get_project_states(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    query = db.query(models.ProjectState)
    
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.ProjectState.name.ilike(term),
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_project_state(db: Session, state: schemas.ProjectStateCreate):
    db_state = models.ProjectState(**state.model_dump())
    db.add(db_state)
    db.commit()
    db.refresh(db_state)
    return db_state

def update_project_state(db: Session, state_id: int, state_update: schemas.ProjectStateUpdate):
    db_state = get_project_state(db, state_id)
    if not db_state:
        return None
    for key, value in state_update.model_dump(exclude_unset=True).items():
        setattr(db_state, key, value)
    db.commit()
    db.refresh(db_state)
    return db_state

def delete_project_state(db: Session, state_id: int):
    db_state = get_project_state(db, state_id)
    if not db_state:
        return None
    db.delete(db_state)
    db.commit()
    return db_state