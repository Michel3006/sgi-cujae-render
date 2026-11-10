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
    prefix="/research-tasks",
    tags=["research-tasks"]
)

@router.get("/", response_model=List[schemas.ResearchTask])
def read_research_tasks(
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    responsible_id: Optional[int] = Query(None, description="Filter by responsible integrant ID"),
    state_id: Optional[int] = Query(None, description="Filter by task state ID"),
    search: Optional[str] = Query(None, description="Search in name, description or compliance report"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_research_tasks(
            db,
            skip=skip,
            limit=limit,
            project_id=project_id,
            responsible_id=responsible_id,
            state_id=state_id,
            search=search
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{task_id}", response_model=schemas.ResearchTask)
def read_research_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.get_research_task(db, task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Research task not found")
    return db_task

@router.post("/", response_model=schemas.ResearchTask)
def create_research_task(task: schemas.ResearchTaskCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_research_task(db=db, task=task)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{task_id}", response_model=schemas.ResearchTask)
def update_research_task(task_id: int, task: schemas.ResearchTaskUpdate, db: Session = Depends(get_db)):
    try:
        db_task = crud.update_research_task(db, task_id, task)
        if db_task is None:
            raise HTTPException(status_code=404, detail="Research task not found")
        return db_task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{task_id}", response_model=schemas.ResearchTask)
def delete_research_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.delete_research_task(db, task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Research task not found")
    return db_task