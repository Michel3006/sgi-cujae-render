# project_classification/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from modules.auth.dependencies import require_authenticated, require_admin
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
    prefix="/project-classifications",
    tags=["project-classifications"],
    dependencies=[Depends(require_authenticated)],
)

@router.get("/", response_model=List[schemas.ProjectClassification])
def read_project_classifications(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search in name or code"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_project_classifications(db, skip=skip, limit=limit, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{classification_id}", response_model=schemas.ProjectClassification)
def read_project_classification(classification_id: int, db: Session = Depends(get_db)):
    db_classification = crud.get_project_classification(db, classification_id)
    if db_classification is None:
        raise HTTPException(status_code=404, detail="Clasificación de proyecto no encontrada")
    return db_classification

@router.post("/", response_model=schemas.ProjectClassification, dependencies=[Depends(require_admin)])
def create_project_classification(classification: schemas.ProjectClassificationCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_project_classification(db=db, classification=classification)
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/{classification_id}", response_model=schemas.ProjectClassification, dependencies=[Depends(require_admin)])
def update_project_classification(classification_id: int, classification: schemas.ProjectClassificationUpdate, db: Session = Depends(get_db)):
    try:
        db_classification = crud.update_project_classification(db, classification_id, classification)
        if db_classification is None:
            raise HTTPException(status_code=404, detail="Clasificación de proyecto no encontrada")
        return db_classification
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{classification_id}", response_model=schemas.ProjectClassification, dependencies=[Depends(require_admin)])
def delete_project_classification(classification_id: int, db: Session = Depends(get_db)):
    db_classification = crud.delete_project_classification(db, classification_id)
    if db_classification is None:
        raise HTTPException(status_code=404, detail="Clasificación de proyecto no encontrada")
    return db_classification