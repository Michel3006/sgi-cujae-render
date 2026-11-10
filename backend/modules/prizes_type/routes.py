# prizes_types/routes.py
from fastapi import APIRouter, Depends, HTTPException
from modules.auth.dependencies import require_authenticated, require_admin
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
    prefix="/prize-types",
    tags=["prize-types"],
    dependencies=[Depends(require_authenticated)],
)

@router.get("/", response_model=List[schemas.PrizeType])
def read_prize_types(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_prize_types(db, skip=skip, limit=limit)

@router.get("/{type_id}", response_model=schemas.PrizeType)
def read_prize_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.get_prize_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Tipo de premio no encontrado")
    return db_type

@router.post("/", response_model=schemas.PrizeType, dependencies=[Depends(require_admin)])
def create_prize_type(prize_type: schemas.PrizeTypeCreate, db: Session = Depends(get_db)):
    return crud.create_prize_type(db=db, prize_type=prize_type)

@router.put("/{type_id}", response_model=schemas.PrizeType, dependencies=[Depends(require_admin)])
def update_prize_type(type_id: int, prize_type: schemas.PrizeTypeUpdate, db: Session = Depends(get_db)):
    db_type = crud.update_prize_type(db, type_id, prize_type)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Tipo de premio no encontrado")
    return db_type

@router.delete("/{type_id}", response_model=schemas.PrizeType, dependencies=[Depends(require_admin)])
def delete_prize_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.delete_prize_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Tipo de premio no encontrado")
    return db_type