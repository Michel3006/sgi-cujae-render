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
    prefix="/research-task-states",
    tags=["research-task-states"]
)

@router.get("/", response_model=List[schemas.ResearchTaskState])
def read_research_task_states(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search in name"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_research_task_states(db, skip=skip, limit=limit, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{state_id}", response_model=schemas.ResearchTaskState)
def read_research_task_state(state_id: int, db: Session = Depends(get_db)):
    db_state = crud.get_research_task_state(db, state_id)
    if db_state is None:
        raise HTTPException(status_code=404, detail="Research task state not found")
    return db_state

@router.post("/", response_model=schemas.ResearchTaskState)
def create_research_task_state(state: schemas.ResearchTaskStateCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_research_task_state(db=db, state=state)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{state_id}", response_model=schemas.ResearchTaskState)
def update_research_task_state(state_id: int, state: schemas.ResearchTaskStateUpdate, db: Session = Depends(get_db)):
    try:
        db_state = crud.update_research_task_state(db, state_id, state)
        if db_state is None:
            raise HTTPException(status_code=404, detail="Research task state not found")
        return db_state
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{state_id}", response_model=schemas.ResearchTaskState)
def delete_research_task_state(state_id: int, db: Session = Depends(get_db)):
    db_state = crud.delete_research_task_state(db, state_id)
    if db_state is None:
        raise HTTPException(status_code=404, detail="Research task state not found")
    return db_state