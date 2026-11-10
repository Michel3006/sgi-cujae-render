# prizes/routes.py
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
    prefix="/prizes",
    tags=["prizes"]
)

@router.get("/", response_model=List[schemas.Prize])
def read_prizes(
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = Query(None, description="Filter prizes by author ID"),
    search: Optional[str] = Query(None, description="Search term in any text field (title, institution, keywords, etc.)"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_prizes(db, skip=skip, limit=limit, author_id=author_id, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/{prize_id}", response_model=schemas.Prize)
def read_prize(prize_id: int, db: Session = Depends(get_db)):
    db_prize = crud.get_prize(db, prize_id)
    if db_prize is None:
        raise HTTPException(status_code=404, detail="Prize not found")
    return db_prize

@router.post("/", response_model=schemas.Prize)
def create_prize(prize: schemas.PrizeCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_prize(db=db, prize=prize)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as i:
        print(i)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{prize_id}", response_model=schemas.Prize)
def update_prize(prize_id: int, prize: schemas.PrizeUpdate, db: Session = Depends(get_db)):
    try:
        db_prize = crud.update_prize(db, prize_id, prize)
        if db_prize is None:
            raise HTTPException(status_code=404, detail="Prize not found")
        return db_prize
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as i:
        print(i)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{prize_id}", response_model=schemas.Prize)
def delete_prize(prize_id: int, db: Session = Depends(get_db)):
    db_prize = crud.delete_prize(db, prize_id)
    if db_prize is None:
        raise HTTPException(status_code=404, detail="Prize not found")
    return db_prize

@router.get("/count/{faculty_id}", response_model=schemas.PrizeCountByFaculty)
def get_prize_count_by_faculty_endpoint(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    """
    Devuelve el conteo total de premios y los que tienen al menos un autor 
    perteneciente a la facultad especificada.
    """
    try:
        result = crud.get_prize_count_by_faculty(db, faculty_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener los conteos de premios por facultad"
        )