# project_state/routes.py
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
    prefix="/project-states",
    tags=["project-states"],
    dependencies=[Depends(require_authenticated)],
)

@router.get("/", response_model=List[schemas.ProjectState])
def read_project_states(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search in name"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_project_states(db, skip=skip, limit=limit, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{state_id}", response_model=schemas.ProjectState)
def read_project_state(state_id: int, db: Session = Depends(get_db)):
    db_state = crud.get_project_state(db, state_id)
    if db_state is None:
        raise HTTPException(status_code=404, detail="Estado de proyecto no encontrado")
    return db_state

@router.post("/", response_model=schemas.ProjectState, dependencies=[Depends(require_admin)])
def create_project_state(state: schemas.ProjectStateCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_project_state(db=db, state=state)
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/{state_id}", response_model=schemas.ProjectState, dependencies=[Depends(require_admin)])
def update_project_state(state_id: int, state: schemas.ProjectStateUpdate, db: Session = Depends(get_db)):
    try:
        db_state = crud.update_project_state(db, state_id, state)
        if db_state is None:
            raise HTTPException(status_code=404, detail="Estado de proyecto no encontrado")
        return db_state
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{state_id}", response_model=schemas.ProjectState, dependencies=[Depends(require_admin)])
def delete_project_state(state_id: int, db: Session = Depends(get_db)):
    db_state = crud.delete_project_state(db, state_id)
    if db_state is None:
        raise HTTPException(status_code=404, detail="Estado de proyecto no encontrado")
    return db_state