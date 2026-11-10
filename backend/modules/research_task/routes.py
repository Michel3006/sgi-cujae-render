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
    prefix="/research-tasks",
    tags=["research-tasks"],
    dependencies=[Depends(require_authenticated)],
)

@router.get("/", response_model=List[schemas.ResearchTask])
def read_research_tasks(
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[int] = Query(None, description="Filtrar por id de proyecto"),
    id_project: Optional[int] = Query(None, description="Filtrar por id de proyecto (alias)"),
    responsible_id: Optional[int] = Query(None, description="Filtrar por id del integrante responsable"),
    state_id: Optional[int] = Query(None, description="Filtrar por id del estado de la tarea"),
    search: Optional[str] = Query(None, description="Buscar en nombre, descripción o informe de cumplimiento"),
    db: Session = Depends(get_db)
):
    try:
        effective_project_id = project_id if project_id is not None else id_project
        return crud.get_research_tasks(
            db,
            skip=skip,
            limit=limit,
            project_id=effective_project_id,
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
        raise HTTPException(status_code=404, detail="Tarea de investigación no encontrada")
    return db_task

@router.post("/", response_model=schemas.ResearchTask, dependencies=[Depends(require_admin)])
def create_research_task(task: schemas.ResearchTaskCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_research_task(db=db, task=task)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/{task_id}", response_model=schemas.ResearchTask, dependencies=[Depends(require_admin)])
def update_research_task(task_id: int, task: schemas.ResearchTaskUpdate, db: Session = Depends(get_db)):
    try:
        db_task = crud.update_research_task(db, task_id, task)
        if db_task is None:
            raise HTTPException(status_code=404, detail="Tarea de investigación no encontrada")
        return db_task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{task_id}", response_model=schemas.ResearchTask, dependencies=[Depends(require_admin)])
def delete_research_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.delete_research_task(db, task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Tarea de investigación no encontrada")
    return db_task