from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import SessionLocal
from . import crud, schemas

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(
    prefix="/article-types",
    tags=["article-types"]
)

@router.get("/", response_model=List[schemas.ArticleType])
def read_article_types(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_article_types(db, skip=skip, limit=limit)

@router.get("/{type_id}", response_model=schemas.ArticleType)
def read_article_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.get_article_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Article type not found")
    return db_type

@router.post("/", response_model=schemas.ArticleType)
def create_article_type(article_type: schemas.ArticleTypeCreate, db: Session = Depends(get_db)):
    return crud.create_article_type(db=db, article_type=article_type)

@router.put("/{type_id}", response_model=schemas.ArticleType)
def update_article_type(type_id: int, article_type: schemas.ArticleTypeUpdate, db: Session = Depends(get_db)):
    db_type = crud.update_article_type(db, type_id, article_type)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Article type not found")
    return db_type

@router.delete("/{type_id}", response_model=schemas.ArticleType)
def delete_article_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.delete_article_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Article type not found")
    return db_type