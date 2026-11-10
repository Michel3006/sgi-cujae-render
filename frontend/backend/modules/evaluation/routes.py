# evaluation/routes.py
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
    prefix="/evaluations",
    tags=["evaluations"]
)

@router.get("/", response_model=List[schemas.Evaluation])
def read_evaluations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    evaluations = crud.get_evaluations(db, skip=skip, limit=limit)
    return evaluations

@router.get("/{evaluation_id}", response_model=schemas.Evaluation)
def read_evaluation(evaluation_id: int, db: Session = Depends(get_db)):
    db_evaluation = crud.get_evaluation(db, evaluation_id)
    if db_evaluation is None:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return db_evaluation

@router.post("/", response_model=schemas.Evaluation)
def create_evaluation(evaluation: schemas.EvaluationCreate, db: Session = Depends(get_db)):
    return crud.create_evaluation(db=db, evaluation=evaluation)

@router.put("/{evaluation_id}", response_model=schemas.Evaluation)
def update_evaluation(evaluation_id: int, evaluation: schemas.EvaluationUpdate, db: Session = Depends(get_db)):
    db_evaluation = crud.update_evaluation(db, evaluation_id, evaluation)
    if db_evaluation is None:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return db_evaluation

@router.delete("/{evaluation_id}", response_model=schemas.Evaluation)
def delete_evaluation(evaluation_id: int, db: Session = Depends(get_db)):
    db_evaluation = crud.delete_evaluation(db, evaluation_id)
    if db_evaluation is None:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return db_evaluation