from sqlalchemy.orm import Session
from . import models, schemas

def get_article_type(db: Session, type_id: int):
    return db.query(models.ArticleType).filter(models.ArticleType.id_article_type == type_id).first()

def get_article_types(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.ArticleType).offset(skip).limit(limit).all()

def create_article_type(db: Session, article_type: schemas.ArticleTypeCreate):
    db_type = models.ArticleType(**article_type.model_dump())
    db.add(db_type)
    db.commit()
    db.refresh(db_type)
    return db_type

def update_article_type(db: Session, type_id: int, article_type_update: schemas.ArticleTypeUpdate):
    db_type = get_article_type(db, type_id)
    if not db_type:
        return None
    for key, value in article_type_update.model_dump(exclude_unset=True).items():
        setattr(db_type, key, value)
    db.commit()
    db.refresh(db_type)
    return db_type

def delete_article_type(db: Session, type_id: int):
    db_type = get_article_type(db, type_id)
    if not db_type:
        return None
    db.delete(db_type)
    db.commit()
    return db_type