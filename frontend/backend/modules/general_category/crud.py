# general_category/crud.py
from sqlalchemy.orm import Session
from . import models, schemas

def get_general_category(db: Session, category_id: int):
    return db.query(models.GeneralCategory).filter(models.GeneralCategory.id_general_category == category_id).first()

def get_general_categories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.GeneralCategory).offset(skip).limit(limit).all()

def create_general_category(db: Session, category: schemas.GeneralCategoryCreate):
    db_category = models.GeneralCategory(name=category.name)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def update_general_category(db: Session, category_id: int, category_update: schemas.GeneralCategoryUpdate):
    db_category = get_general_category(db, category_id)
    if not db_category:
        return None
    update_data = category_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_category, key, value)
    db.commit()
    db.refresh(db_category)
    return db_category

def delete_general_category(db: Session, category_id: int):
    db_category = get_general_category(db, category_id)
    if not db_category:
        return None
    db.delete(db_category)
    db.commit()
    return db_category