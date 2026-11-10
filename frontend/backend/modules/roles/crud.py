# roles/crud.py
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas

def get_role(db: Session, role_id: int):
    return db.query(models.Role).filter(models.Role.id_rol == role_id).first()

def get_roles(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    query = db.query(models.Role)
    
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.Role.role_name.ilike(term),
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_role(db: Session, role: schemas.RoleCreate):
    db_role = models.Role(id_rol=role.id_role, role_name=role.role_name)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

def update_role(db: Session, role_id: int, role_update: schemas.RoleUpdate):
    db_role = get_role(db, role_id)
    if not db_role:
        return None
    for key, value in role_update.model_dump(exclude_unset=True).items():
        setattr(db_role, key, value)
    db.commit()
    db.refresh(db_role)
    return db_role

def delete_role(db: Session, role_id: int):
    db_role = get_role(db, role_id)
    if not db_role:
        return None
    db.delete(db_role)
    db.commit()
    return db_role