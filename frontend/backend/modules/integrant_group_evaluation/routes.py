# integrant_group_evaluation/routes.py
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
    prefix="/integrant-group-evaluations",
    tags=["integrant-group-evaluations"],
)


@router.get("/", response_model=List[schemas.IntegrantGroupEvaluation])
def read_integrant_group_evaluations(
    skip: int = 0,
    limit: int = 100,
    id_group: Optional[int] = Query(None, description="Filtrar por id de grupo"),
    id_integrant: Optional[int] = Query(None, description="Filtrar por id de integrante"),
    id_evaluation: Optional[int] = Query(None, description="Filtrar por id de evaluación"),
    db: Session = Depends(get_db),
):
    try:
        return crud.get_integrant_group_evaluations(
            db,
            skip=skip,
            limit=limit,
            id_group=id_group,
            id_integrant=id_integrant,
            id_evaluation=id_evaluation,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{item_id}", response_model=schemas.IntegrantGroupEvaluation)
def read_integrant_group_evaluation(item_id: int, db: Session = Depends(get_db)):
    db_item = crud.get_integrant_group_evaluation(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Integrant group evaluation not found")
    return db_item


@router.post("/", response_model=schemas.IntegrantGroupEvaluation)
def create_integrant_group_evaluation(
    item: schemas.IntegrantGroupEvaluationCreate, db: Session = Depends(get_db)
):
    try:
        return crud.create_integrant_group_evaluation(db=db, item=item)
    except Exception as e:
        raise HTTPException(status_code=500, detail= str(e))


@router.put("/{item_id}", response_model=schemas.IntegrantGroupEvaluation)
def update_integrant_group_evaluation(
    item_id: int, item: schemas.IntegrantGroupEvaluationUpdate, db: Session = Depends(get_db)
):
    try:
        db_item = crud.update_integrant_group_evaluation(db, item_id, item)
        if db_item is None:
            raise HTTPException(status_code=404, detail="Integrant group evaluation not found")
        return db_item
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{item_id}", response_model=schemas.IntegrantGroupEvaluation)
def delete_integrant_group_evaluation(item_id: int, db: Session = Depends(get_db)):
    db_item = crud.delete_integrant_group_evaluation(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Integrant group evaluation not found")
    return db_item
