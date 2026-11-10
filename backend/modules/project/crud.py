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


def _load_project_members(db: Session, project_id: int) -> list:
    member_records = db.execute(
        select(
            models.project_integrant.c.id_integrant,
            models.project_integrant.c.admin,
        ).where(models.project_integrant.c.id_project == project_id)
    ).all()

    integrant_ids = [mid for mid, _ in member_records]
    integrant_map = {}
    if integrant_ids:
        integrants = db.query(Integrant).filter(
            Integrant.id_integrant.in_(integrant_ids)
        ).all()
        integrant_map = {i.id_integrant: i for i in integrants}

    enriched_members = []
    for mid, is_admin in member_records:
        if mid in integrant_map:
            i = integrant_map[mid]
            enriched_members.append({
                "id_integrant": i.id_integrant,
                "name": i.name,
                "admin": is_admin,
            })
    return enriched_members


def _project_with_members(db: Session, project: models.Project) -> dict:
    return {
        "id_project": project.id_project,
        "title": project.title,
        "code": project.code,
        "id_responsible": project.id_responsible,
        "thematic": project.thematic,
        "id_project_type": project.id_project_type,
        "art_state": project.art_state,
        "cientific_problem": project.cientific_problem,
        "study_object": project.study_object,
        "study_field": project.study_field,
        "hypothesis": project.hypothesis,
        "main_objective": project.main_objective,
        "research_methods": project.research_methods,
        "interested_third_party": project.interested_third_party,
        "national_group": project.national_group,
        "international_group": project.international_group,
        "publish_magazine": project.publish_magazine,
        "participate_events": project.participate_events,
        "citma_code": project.citma_code,
        "minvec_code": project.minvec_code,
        "approved": project.approved,
        "conseil_criteria": project.conseil_criteria,
        "initial_date": project.initial_date,
        "final_date": project.final_date,
        "update_date": project.update_date,
        "id_project_state": project.id_project_state,
        "id_project_classification": project.id_project_classification,
        "economic_budget": project.economic_budget,
        "economic_needs": project.economic_needs,
        "id_faculty": project.id_faculty,
        "concluded": project.concluded,
        "approved_date": project.approved_date,
        "general_budget_cup": project.general_budget_cup,
        "year_budget_cup": project.year_budget_cup,
        "is_international": project.is_international,
        "is_national": project.is_national,
        "is_territorial": project.is_territorial,
        "is_cujae": project.is_cujae,
        "keywords": project.keywords,
        "responsible": project.responsible,
        "project_type": project.project_type,
        "project_state": project.project_state,
        "project_classification": project.project_classification,
        "faculty": project.faculty,
        "members": _load_project_members(db, project.id_project),
    }


def _get_project_orm(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id_project == project_id).first()


def get_project(db: Session, project_id: int):
    project = _get_project_orm(db, project_id)
    if not project:
        return None
    return _project_with_members(db, project)

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
        raise ValueError(f"El tipo de proyecto con id {project.id_project_type} no existe")
    
    if project.id_project_state and not _exists(db, ProjectState, ProjectState.id_project_state, project.id_project_state):
        raise ValueError(f"El estado de proyecto con id {project.id_project_state} no existe")
    
    if project.id_project_classification and not _exists(db, ProjectClassification, ProjectClassification.id_project_classification, project.id_project_classification):
        raise ValueError(f"La clasificación de proyecto con id {project.id_project_classification} no existe")
    
    if project.id_faculty and not _exists(db, Faculty, Faculty.id_faculty, project.id_faculty):
        raise ValueError(f"La facultad con id {project.id_faculty} no existe")

    # --- Procesar responsable (id_responsible) ---
    responsible_id_to_use: Optional[int] = None
    if project.id_responsible is not None:
        if isinstance(project.id_responsible, int):
            if not db.query(Integrant).filter(Integrant.id_integrant == project.id_responsible).first():
                raise ValueError(f"El integrante responsable con id {project.id_responsible} no existe")
            responsible_id_to_use = project.id_responsible
        elif isinstance(project.id_responsible, schemas.NewIntegrant):
           
            new_resp = Integrant(
                name=project.id_responsible.name,
                work_center=project.id_responsible.work_center,
                email=project.id_responsible.email,
                id_country=project.id_responsible.id_country,
                external=True
            )
            db.add(new_resp)
            db.flush()
            responsible_id_to_use = new_resp.id_integrant
        else:
            raise ValueError("Tipo inválido para id_responsible")

    # --- Procesar miembros ---
    member_ids_to_associate = []
    existing_member_ids = []
    new_members_data = []

    for member in project.member_ids:
        if isinstance(member, int):
            existing_member_ids.append(member)
        elif isinstance(member, schemas.NewIntegrant):
            new_members_data.append(member)
        else:
            raise ValueError("Entrada inválida en member_ids: debe ser int o NewIntegrant")

    # Validar países de nuevos miembros
    new_country_ids = {m.id_country for m in new_members_data}
    

    # Validar miembros existentes
    if existing_member_ids:
        existing = db.query(Integrant).filter(
            Integrant.id_integrant.in_(existing_member_ids)
        ).all()
        if len(existing) != len(existing_member_ids):
            raise ValueError("Uno o más IDs de miembros no existen")

    # Crear nuevos miembros
    for new_member in new_members_data:
        db_new = models.Integrant(
            name=new_member.name,
            work_center=new_member.work_center,
            email=new_member.email,
            id_country=new_member.id_country,
            external=True
        )
        db.add(db_new)
        db.flush()
        member_ids_to_associate.append(db_new.id_integrant)

    # Añadir miembros existentes
    member_ids_to_associate.extend(existing_member_ids)

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
from typing import List, Optional

def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate):
    db_project = _get_project_orm(db, project_id)
    if not db_project:
        return None

    data = project_update.model_dump(exclude_unset=True)

    # --- Validación de FKs ---
    if "id_responsible" in data and data["id_responsible"] is not None:
        exists = db.query(Integrant).filter(
            Integrant.id_integrant == data["id_responsible"]
        ).first()
        if not exists:
            raise ValueError(f"El integrante responsable con id {data['id_responsible']} no existe")

    # --- Actualizar miembros si se proporcionan ---
    if "member_ids" in data and isinstance(data["member_ids"], list):
        member_ids: List[int] = data["member_ids"]

        # Validar que todos los IDs de integrantes existan
        if member_ids:
            existing_ids = {
                id_ for id_, in db.execute(
                    select(Integrant.id_integrant)
                    .where(Integrant.id_integrant.in_(member_ids))
                )
            }
            missing = set(member_ids) - existing_ids
            if missing:
                raise ValueError(f"Los siguientes IDs de integrantes no existen: {missing}")

        # Eliminar todos los miembros actuales del proyecto
        db.execute(
            delete(models.project_integrant)
            .where(models.project_integrant.c.id_project == project_id)
        )

        # Insertar los nuevos miembros (todos con admin=False, a menos que especifiques)
        if member_ids:
            new_members = [
                {"id_project": project_id, "id_integrant": mid, "admin": False}
                for mid in member_ids
            ]
            db.execute(insert(models.project_integrant), new_members)

    # --- Actualizar campos del proyecto ---
    for key, value in data.items():
        if key != "member_ids":
            setattr(db_project, key, value)

    db.commit()
    db.refresh(db_project)
    return _project_with_members(db, db_project)

def delete_project(db: Session, project_id: int):
    db_project = _get_project_orm(db, project_id)
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
    Incluye facultades con 0 proyectos (usando outerjoin si lo deseas),
    pero en este caso solo mostramos facultades que tienen al menos un proyecto.
    """
    results = (
        db.query(
            Faculty.name.label("faculty_name"),
            func.count(models.Project.id_project).label("project_count")
        )
        .join(models.Project, Faculty.id_faculty == models.Project.id_faculty)
        .group_by(Faculty.id_faculty, Faculty.name)
        .all()
    )
    return [{"faculty_name": name, "project_count": count} for name, count in results]