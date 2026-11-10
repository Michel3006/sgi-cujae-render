# project/crud.py
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import Column, or_
from . import models, schemas
from modules.integrant.models import Integrant
from modules.project_classification.models import ProjectClassification
from modules.project_state.models import ProjectState
from modules.project_type.models import ProjectType
from modules.faculty.models import Faculty
from sqlalchemy.orm import joinedload

# Validadores de FKs (importamos los CRUDs si los usas; aquí validamos directamente)
def _exists(db: Session, model, column: Column, value):
    return db.query(model).filter(column == value).first() is not None

from sqlalchemy import select
from sqlalchemy import select

def get_project(db: Session, project_id: int):
    # 1. Obtener el proyecto
    project = db.query(models.Project).filter(models.Project.id_project == project_id).first()
    if not project:
        return None

    # 2. Cargar miembros con 'admin' desde la tabla intermedia
    member_records = db.execute(
        select(
            models.project_integrant.c.id_integrant,
            models.project_integrant.c.admin
        ).where(models.project_integrant.c.id_project == project_id)
    ).all()

    # 3. Cargar los objetos Integrant
    integrant_ids = [mid for mid, _ in member_records]
    integrant_map = {}
    if integrant_ids:
        integrants = db.query(Integrant).filter(
            Integrant.id_integrant.in_(integrant_ids)
        ).all()
        integrant_map = {i.id_integrant: i for i in integrants}

    # 4. Construir lista de miembros con 'admin'
    enriched_members = []
    for mid, is_admin in member_records:
        if mid in integrant_map:
            i = integrant_map[mid]
            enriched_members.append({
                "id_integrant": i.id_integrant,
                "name": i.name,
                "admin": is_admin
            })

    # 5. Devolver un dict que coincida con tu esquema Project
    return project

from sqlalchemy.orm import aliased
from sqlalchemy import or_

def get_projects(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    responsible_id: Optional[int] = None,
    group_id: Optional[int] = None,
    search: Optional[str] = None
):
    # Creamos alias para evitar conflictos al hacer múltiples joins con Integrant
    ResponsibleAlias = aliased(Integrant)
    MemberAlias = aliased(Integrant)

    query = db.query(models.Project)

    # Filtros básicos
    if responsible_id is not None:
        query = query.filter(models.Project.id_responsible == responsible_id)

    # Búsqueda extendida
    if search:
        term = f"%{search}%"

        # Hacemos JOIN con el responsable
        query = query.outerjoin(
            ResponsibleAlias,
            models.Project.id_responsible == ResponsibleAlias.id_integrant
        )

        # Hacemos JOIN con los miembros (tabla intermedia + integrant)
        query = query.outerjoin(
            models.project_integrant,
            models.Project.id_project == models.project_integrant.c.id_project
        ).outerjoin(
            MemberAlias,
            models.project_integrant.c.id_integrant == MemberAlias.id_integrant
        )

        # Condición de búsqueda: en campos del proyecto + nombres
        query = query.filter(
            or_(
                models.Project.title.ilike(term),
                models.Project.code.ilike(term),
                models.Project.thematic.ilike(term),
                models.Project.cientific_problem.ilike(term),
                models.Project.main_objective.ilike(term),
                models.Project.citma_code.ilike(term),
                models.Project.minvec_code.ilike(term),
                ResponsibleAlias.name.ilike(term),  # nombre del responsable
                MemberAlias.name.ilike(term)        # nombre de cualquier miembro
            )
        )

        # Evitar duplicados (un proyecto con 3 miembros que coinciden → 3 filas)
        query = query.distinct()

    return query.offset(skip).limit(limit).all()

from sqlalchemy import select

def create_project(db: Session, project: schemas.ProjectCreate):
    # Validar FKs (tipos, estados, clasificación, facultad)
    if project.id_project_type and not _exists(db, ProjectType, ProjectType.id_project_type, project.id_project_type):
        raise ValueError(f"Project type id {project.id_project_type} does not exist")
    
    if project.id_project_state and not _exists(db, ProjectState, ProjectState.id_project_state, project.id_project_state):
        raise ValueError(f"Project state id {project.id_project_state} does not exist")
    
    if project.id_project_classification and not _exists(db, ProjectClassification, ProjectClassification.id_project_classification, project.id_project_classification):
        raise ValueError(f"Project classification id {project.id_project_classification} does not exist")
    
    if project.id_faculty and not _exists(db, Faculty, Faculty.id_faculty, project.id_faculty):
        raise ValueError(f"Faculty id {project.id_faculty} does not exist")

    # --- Procesar responsable (id_responsible) ---
    responsible_id_to_use: Optional[int] = None
    if project.id_responsible is not None:
        if isinstance(project.id_responsible, int):
            if not db.query(Integrant).filter(Integrant.id_integrant == project.id_responsible).first():
                raise ValueError(f"Responsible integrant id {project.id_responsible} does not exist")
            responsible_id_to_use = project.id_responsible
        elif isinstance(project.id_responsible, schemas.NewIntegrant):
            new_resp = Integrant(
                name=project.id_responsible.name,
                work_center=project.id_responsible.work_center,
                email=project.id_responsible.email,
                identity=project.id_responsible.identity,
                id_country=project.id_responsible.id_country,
                external=True,
            )
            db.add(new_resp)
            db.flush()
            responsible_id_to_use = new_resp.id_integrant
        else:
            raise ValueError("Invalid type for id_responsible")

    # --- Procesar miembros ---
    member_ids_to_associate = _resolve_member_ids(db, project.member_ids)

    # --- Crear el proyecto ---
    project_data = project.model_dump(exclude={"id_responsible", "member_ids"})
    project_data["id_responsible"] = responsible_id_to_use
    db_project = models.Project(**project_data)
    db.add(db_project)
    db.flush()

    # --- Asociar miembros al proyecto ---
    for mid in member_ids_to_associate:
        db.execute(
            models.project_integrant.insert().values(
                id_project=db_project.id_project,
                id_integrant=mid,
                admin=False
            )
        )

    db.commit()
    db.refresh(db_project)

    # --- Cargar miembros enriquecidos (igual que antes) ---
    member_data = db.execute(
        select(models.project_integrant.c.id_integrant, models.project_integrant.c.admin)
        .where(models.project_integrant.c.id_project == db_project.id_project)
    ).all()

    integrant_ids = [mid for mid, _ in member_data]
    integrant_map = {}
    if integrant_ids:
        integrants = db.query(Integrant).filter(
            Integrant.id_integrant.in_(integrant_ids)
        ).all()
        integrant_map = {i.id_integrant: i for i in integrants}

    enriched_members = []
    for mid, is_admin in member_data:
        if mid in integrant_map:
            i = integrant_map[mid]
            enriched_members.append({
                "id_integrant": i.id_integrant,
                "name": i.name,
                "admin": is_admin
            })

    # --- Devolver el proyecto con todos sus campos + miembros ---
    return {
        "id_project": db_project.id_project,
        "title": db_project.title,
        "code": db_project.code,
        "description": db_project.description,
        "objectives": db_project.objectives,
        "tasks": db_project.tasks,
        "scientific_details": db_project.scientific_details,
        "other_data": db_project.other_data,
        "id_responsible": db_project.id_responsible,
        "thematic": db_project.thematic,
        "id_project_type": db_project.id_project_type,
        "art_state": db_project.art_state,
        "cientific_problem": db_project.cientific_problem,
        "study_object": db_project.study_object,
        "study_field": db_project.study_field,
        "hypothesis": db_project.hypothesis,
        "main_objective": db_project.main_objective,
        "research_methods": db_project.research_methods,
        "interested_third_party": db_project.interested_third_party,
        "national_group": db_project.national_group,
        "international_group": db_project.international_group,
        "publish_magazine": db_project.publish_magazine,
        "participate_events": db_project.participate_events,
        "citma_code": db_project.citma_code,
        "minvec_code": db_project.minvec_code,
        "approved": db_project.approved,
        "conseil_criteria": db_project.conseil_criteria,
        "initial_date": db_project.initial_date,
        "final_date": db_project.final_date,
        "update_date": db_project.update_date,
        "id_project_state": db_project.id_project_state,
        "id_project_classification": db_project.id_project_classification,
        "economic_budget": db_project.economic_budget,
        "economic_needs": db_project.economic_needs,
        "id_faculty": db_project.id_faculty,
        "concluded": db_project.concluded,
        "approved_date": db_project.approved_date,
        "general_budget_cup": db_project.general_budget_cup,
        "year_budget_cup": db_project.year_budget_cup,
        "is_international": db_project.is_international,
        "is_national": db_project.is_national,
        "is_territorial": db_project.is_territorial,
        "is_cujae": db_project.is_cujae,
        "keywords": db_project.keywords,
        "responsible": db_project.responsible,
        "project_type": db_project.project_type,
        "project_state": db_project.project_state,
        "project_classification": db_project.project_classification,
        "faculty": db_project.faculty,
        "members": enriched_members
    }

from sqlalchemy import delete, insert
from typing import List, Optional, Union


def _resolve_member_ids(
    db: Session,
    member_entries: List[Union[int, schemas.NewIntegrant]],
) -> List[int]:
    """Convierte IDs y NewIntegrant en una lista de id_integrant."""
    resolved: List[int] = []
    existing_ids: List[int] = []
    new_members_data: List[schemas.NewIntegrant] = []

    for member in member_entries:
        if isinstance(member, int):
            existing_ids.append(member)
        elif isinstance(member, schemas.NewIntegrant):
            new_members_data.append(member)
        else:
            raise ValueError("Invalid entry in member_ids: must be int or NewIntegrant")

    if existing_ids:
        existing = db.query(Integrant).filter(
            Integrant.id_integrant.in_(existing_ids)
        ).all()
        if len(existing) != len(existing_ids):
            raise ValueError("One or more existing member IDs do not exist")
        resolved.extend(existing_ids)

    for new_member in new_members_data:
        db_new = Integrant(
            name=new_member.name,
            work_center=new_member.work_center,
            email=new_member.email,
            identity=new_member.identity,
            id_country=new_member.id_country,
            external=True,
        )
        db.add(db_new)
        db.flush()
        resolved.append(db_new.id_integrant)

    return resolved


def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate):
    db_project = get_project(db, project_id)
    if not db_project:
        return None

    data = project_update.model_dump(exclude_unset=True)

    if "id_responsible" in data and data["id_responsible"] is not None:
        exists = db.query(Integrant).filter(
            Integrant.id_integrant == data["id_responsible"]
        ).first()
        if not exists:
            raise ValueError(f"Responsible integrant id {data['id_responsible']} does not exist")

    if "member_ids" in data and data["member_ids"] is not None:
        member_ids = _resolve_member_ids(db, data["member_ids"])

        db.execute(
            delete(models.project_integrant)
            .where(models.project_integrant.c.id_project == project_id)
        )

        if member_ids:
            new_members = [
                {"id_project": project_id, "id_integrant": mid, "admin": False}
                for mid in member_ids
            ]
            db.execute(insert(models.project_integrant), new_members)

    for key, value in data.items():
        if key != "member_ids":
            setattr(db_project, key, value)

    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int):
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    db.execute(models.project_integrant.delete().where(models.project_integrant.c.id_project == project_id))
    db.delete(db_project)
    db.commit()
    return db_project

from sqlalchemy.orm import Session
from modules.faculty.models import Faculty
from sqlalchemy import func

def get_project_count_by_faculty(db: Session):
    """
    Devuelve una lista de dicts con:
      - faculty_name: nombre de la facultad
      - project_count: número de proyectos asociados a esa facultad
    Incluye proyectos sin facultad bajo «Sin facultad».
    """
    results = (
        db.query(
            Faculty.name.label("faculty_name"),
            func.count(models.Project.id_project).label("project_count"),
        )
        .join(models.Project, Faculty.id_faculty == models.Project.id_faculty)
        .group_by(Faculty.id_faculty, Faculty.name)
        .all()
    )
    output = [{"faculty_name": name, "project_count": count} for name, count in results]

    without_faculty = (
        db.query(func.count(models.Project.id_project))
        .filter(models.Project.id_faculty.is_(None))
        .scalar()
        or 0
    )
    if without_faculty > 0:
        output.append({"faculty_name": "Sin facultad", "project_count": without_faculty})

    return output