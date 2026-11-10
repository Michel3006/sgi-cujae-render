from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import SessionLocal
from . import crud, schemas

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(
    prefix="/articles",
    tags=["articles"]
)

@router.get("/", response_model=List[schemas.Article])
def read_articles(
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = Query(None, description="Filter articles by author ID (integrant ID)"),
    search: Optional[str] = Query(None, description="Search term in any text field (title, journal, keywords, etc.)"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_articles(db, skip=skip, limit=limit, author_id=author_id, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{article_id}", response_model=schemas.Article)
def read_article(article_id: int, db: Session = Depends(get_db)):
    db_article = crud.get_article(db, article_id)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article

@router.post("/", response_model=schemas.Article)
def create_article(article: schemas.ArticleCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_article(db=db, article=article)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as h:
        raise h
    except Exception as i:
        print(i)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{article_id}", response_model=schemas.Article)
def update_article(article_id: int, article: schemas.ArticleUpdate, db: Session = Depends(get_db)):
    try:
        db_article = crud.update_article(db, article_id, article)
        if db_article is None:
            raise HTTPException(status_code=404, detail="Article not found")
        return db_article
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{article_id}", response_model=schemas.Article)
def delete_article(article_id: int, db: Session = Depends(get_db)):
    db_article = crud.delete_article(db, article_id)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article
@router.get("/count/faculty/{faculty_id}", response_model=schemas.ArticleCountByFaculty)
def get_article_count_by_faculty_endpoint(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    return crud.get_article_count_by_faculty(db, faculty_id)    