# project/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from modules.auth.dependencies import require_authenticated, require_group_project_write, require_stats_view
from sqlalchemy.orm import Session
from typing import List, Optional
from database import SessionLocal
from . import crud, schemas
from modules.research_task.schemas import ResearchTask
from modules.research_task import crud as research_task_crud

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(
    prefix="/projects",
    tags=["projects"],
    dependencies=[Depends(require_authenticated)],
)

@router.get("/", response_model=List[schemas.ProjectWithMembers])
def read_projects(
    skip: int = 0,
    limit: int = 100,
    responsible_id: Optional[int] = Query(None, description="Filter by responsible integrant ID"),
    group_id: Optional[int] = Query(None, description="Filter by group ID"),
    search: Optional[str] = Query(None, description="Search in title, code, objectives, codes, etc."),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_projects(
            db,
            skip=skip,
            limit=limit,
            responsible_id=responsible_id,
            group_id=group_id,
            search=search
        )
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{project_id}", response_model=schemas.ProjectWithMembers)
def read_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return db_project

@router.post("/", response_model=schemas.Project, dependencies=[Depends(require_group_project_write)])
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_project(db=db, project=project)
    except ValueError as e:
        print(e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as i:
        print(i)
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/{project_id}", response_model=schemas.ProjectWithMembers, dependencies=[Depends(require_group_project_write)])
def update_project(project_id: int, project: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    try:
        db_project = crud.update_project(db, project_id, project)
        if db_project is None:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        return db_project
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as i:
        print(i)
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{project_id}", response_model=schemas.ProjectDelete, dependencies=[Depends(require_group_project_write)])
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.delete_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return db_project

@router.get("/{project_id}/research-tasks", response_model=List[ResearchTask])
def read_project_research_tasks(
    project_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Tareas de investigación asociadas a un proyecto."""
    if crud.get_project(db, project_id) is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return research_task_crud.get_research_tasks(
        db, skip=skip, limit=limit, project_id=project_id
    )

@router.get("/count/faculty/", response_model=list[schemas.ProjectCountByFaculty], dependencies=[Depends(require_stats_view)])
def get_project_count_by_faculty_endpoint(db: Session = Depends(get_db)):
    """
    Devuelve una lista de facultades con la cantidad de proyectos asociados a cada una.
    """
    return crud.get_project_count_by_faculty(db)