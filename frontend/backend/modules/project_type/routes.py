# project_type/routes.py
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
    prefix="/project-types",
    tags=["project-types"]
)

@router.get("/", response_model=List[schemas.ProjectType])
def read_project_types(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search in name"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_project_types(db, skip=skip, limit=limit, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{type_id}", response_model=schemas.ProjectType)
def read_project_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.get_project_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Project type not found")
    return db_type

@router.post("/", response_model=schemas.ProjectType)
def create_project_type(project_type: schemas.ProjectTypeCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_project_type(db=db, project_type=project_type)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{type_id}", response_model=schemas.ProjectType)
def update_project_type(type_id: int, project_type: schemas.ProjectTypeUpdate, db: Session = Depends(get_db)):
    try:
        db_type = crud.update_project_type(db, type_id, project_type)
        if db_type is None:
            raise HTTPException(status_code=404, detail="Project type not found")
        return db_type
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{type_id}", response_model=schemas.ProjectType)
def delete_project_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.delete_project_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Project type not found")
    return db_type