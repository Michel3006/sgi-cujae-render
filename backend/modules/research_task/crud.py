from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from . import models, schemas
from modules.integrant.models import Integrant
from modules.project.models import Project
from modules.research_task_state.models import ResearchTaskState

def get_research_task(db: Session, task_id: int):
    return (
        db.query(models.ResearchTask)
        .options(
            joinedload(models.ResearchTask.responsible),
            joinedload(models.ResearchTask.project),
            joinedload(models.ResearchTask.state),
        )
        .filter(models.ResearchTask.id_research_task == task_id)
        .first()
    )


def get_research_tasks(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[int] = None,
    responsible_id: Optional[int] = None,
    state_id: Optional[int] = None,
    search: Optional[str] = None,
):
    query = db.query(models.ResearchTask).options(
        joinedload(models.ResearchTask.responsible),
        joinedload(models.ResearchTask.project),
        joinedload(models.ResearchTask.state),
    )

    if project_id is not None:
        query = query.filter(models.ResearchTask.id_project == project_id)
    if responsible_id is not None:
        query = query.filter(models.ResearchTask.id_responsible == responsible_id)
    if state_id is not None:
        query = query.filter(models.ResearchTask.id_research_task_state == state_id)
    
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.ResearchTask.name.ilike(term),
                models.ResearchTask.description.ilike(term),
                models.ResearchTask.compliance_report.ilike(term)
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_research_task(db: Session, task: schemas.ResearchTaskCreate):
    # Validar FKs si se proporcionan
    if task.id_responsible and not db.query(Integrant).filter(Integrant.id_integrant == task.id_responsible).first():
        raise ValueError(f"El integrante responsable con id {task.id_responsible} no existe")
    if task.id_project and not db.query(Project).filter(Project.id_project == task.id_project).first():
        raise ValueError(f"El proyecto con id {task.id_project} no existe")
    if task.id_research_task_state and not db.query(ResearchTaskState).filter(ResearchTaskState.id_research_task_state == task.id_research_task_state).first():
        raise ValueError(f"El estado de tarea con id {task.id_research_task_state} no existe")

    db_task = models.ResearchTask(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_research_task(db: Session, task_id: int, task_update: schemas.ResearchTaskUpdate):
    db_task = get_research_task(db, task_id)
    if not db_task:
        return None

    data = task_update.model_dump(exclude_unset=True)

    # Validar FKs si se actualizan
    if "id_responsible" in data and data["id_responsible"] is not None:
        if not db.query(Integrant).filter(Integrant.id_integrant == data["id_responsible"]).first():
            raise ValueError(f"El integrante responsable con id {data['id_responsible']} no existe")
    if "id_project" in data and data["id_project"] is not None:
        if not db.query(Project).filter(Project.id_project == data["id_project"]).first():
            raise ValueError(f"El proyecto con id {data['id_project']} no existe")
    if "id_research_task_state" in data and data["id_research_task_state"] is not None:
        if not db.query(ResearchTaskState).filter(ResearchTaskState.id_research_task_state == data["id_research_task_state"]).first():
            raise ValueError(f"El estado de tarea con id {data['id_research_task_state']} no existe")

    for key, value in data.items():
        setattr(db_task, key, value)

    db.commit()
    db.refresh(db_task)
    return db_task

def delete_research_task(db: Session, task_id: int):
    db_task = get_research_task(db, task_id)
    if not db_task:
        return None
    db.delete(db_task)
    db.commit()
    return db_task