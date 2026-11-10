# group/crud.py
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import false, or_
from datetime import datetime
from . import models, schemas
from modules.faculty.crud import get_faculty
from modules.faculty_area.crud import get_faculty_area
from modules.integrant.models import Integrant

def get_group(db: Session, group_id: int):
    return db.query(models.Group).filter(models.Group.id_group == group_id).first()

from sqlalchemy.orm import aliased

def get_groups(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    id_admin: Optional[int] = None
):
    # Alias para evitar conflictos al hacer múltiples joins con Integrant
    AdminAlias = aliased(Integrant)
    MemberAlias = aliased(Integrant)

    query = db.query(models.Group)

    # Filtro por admin_id
    if id_admin is not None:
        query = query.filter(models.Group.id_admin == id_admin)

    # Aplicar búsqueda
    if search:
        term = f"%{search}%"
        # Hacemos joins con alias
        query = query.outerjoin(AdminAlias, models.Group.id_admin == AdminAlias.id_integrant)
        query = query.outerjoin(models.group_integrant, models.Group.id_group == models.group_integrant.c.id_group)
        query = query.outerjoin(MemberAlias, models.group_integrant.c.id_integrant == MemberAlias.id_integrant)

        # Filtro de búsqueda: en campos del grupo + nombres de admin y miembros
        search_condition = or_(
            models.Group.name.ilike(term),
            models.Group.subjects.ilike(term),
            models.Group.problems.ilike(term),
            AdminAlias.name.ilike(term),
            MemberAlias.name.ilike(term)
        )
        query = query.filter(search_condition)

    # Evitar resultados duplicados si un grupo tiene varios miembros que coinciden
    query = query.distinct()

    return query.offset(skip).limit(limit).all()

def create_group(db: Session, group: schemas.GroupCreate):
    # Validar FKs de facultad y área
    if not get_faculty(db, group.id_faculty):
        raise ValueError(f"Faculty with id {group.id_faculty} does not exist")
    
    if group.id_faculty_area and not get_faculty_area(db, group.id_faculty_area):
        raise ValueError(f"Faculty area with id {group.id_faculty_area} does not exist")

    # Procesar el líder (id_admin)
    admin_id_to_use: int
    if isinstance(group.id_admin, int):
        # Validar que exista
        if not db.query(Integrant).filter(Integrant.id_integrant == group.id_admin).first():
            raise ValueError(f"Leader (integrant id {group.id_admin}) does not exist")
        admin_id_to_use = group.id_admin
    elif isinstance(group.id_admin, schemas.NewIntegrant):
        
        # Crear nuevo líder
        new_leader = Integrant(
            name=group.id_admin.name,
            work_center=group.id_admin.work_center,
            email=group.id_admin.email,
            id_country=group.id_admin.id_country,
            external=True
        )
        db.add(new_leader)
        db.flush()
        admin_id_to_use = new_leader.id_integrant
    else:
        raise ValueError("Invalid type for id_admin: must be int or NewIntegrant")

    # Procesar miembros
    member_ids_to_associate = []
    existing_member_ids = []
    new_members_data = []

    for member in group.member_ids:
        if isinstance(member, int):
            existing_member_ids.append(member)
        elif isinstance(member, schemas.NewIntegrant):
            new_members_data.append(member)
        else:
            raise ValueError("Invalid entry in member_ids: must be int or NewIntegrant")

    # Validar países de nuevos miembros
    new_country_ids = {m.id_country for m in new_members_data}

    # Validar miembros existentes
    if existing_member_ids:
        existing = db.query(Integrant).filter(
            Integrant.id_integrant.in_(existing_member_ids)
        ).all()
        if len(existing) != len(existing_member_ids):
            raise ValueError("One or more existing member IDs do not exist")

    # Crear nuevos miembros
    for new_member in new_members_data:
        db_new = Integrant(
            name=new_member.name,
            work_center=new_member.work_center,
            email=new_member.email,
            id_country=new_member.id_country,
            external=True
        )
        db.add(db_new)
        db.flush()
        member_ids_to_associate.append(db_new.id_integrant)

    # Añadir IDs de miembros existentes
    member_ids_to_associate.extend(existing_member_ids)

    # Crear el grupo
    group_data = group.model_dump(exclude={"id_admin", "member_ids"})
    group_data["id_admin"] = admin_id_to_use  # usar el ID resuelto
    db_group = models.Group(**group_data)
    db.add(db_group)
    db.flush()

    # Asociar miembros (sin incluir al líder como miembro, a menos que esté en la lista)
    for mid in member_ids_to_associate:
        db.execute(
            models.group_integrant.insert().values(
                id_group=db_group.id_group,
                id_integrant=mid,
                admin=False,
            )
        )

    db.commit()
    db.refresh(db_group)
    return db_group

from sqlalchemy import delete, select
from typing import List

def update_group(db: Session, group_id: int, group_update: schemas.GroupUpdate):
    db_group = get_group(db, group_id)
    if not db_group:
        return None

    data = group_update.model_dump(exclude_unset=True)

    # --- Validación de FKs ---
    if "id_faculty" in data and data["id_faculty"] is not None:
        if not get_faculty(db, data["id_faculty"]):
            raise ValueError(f"Faculty with id {data['id_faculty']} does not exist")
    
    if "id_faculty_area" in data and data["id_faculty_area"] is not None:
        if not get_faculty_area(db, data["id_faculty_area"]):
            raise ValueError(f"Faculty area with id {data['id_faculty_area']} does not exist")
    
    if "id_admin" in data and data["id_admin"] is not None:
        if not db.query(Integrant).filter(Integrant.id_integrant == data["id_admin"]).first():
            raise ValueError(f"Leader integrant id {data['id_admin']} does not exist")

    # --- Validación y actualización de miembros ---
    if "member_update_ids" in data and data["member_update_ids"] is not None:
        member_ids: List[int] = data["member_update_ids"]

        # Validar que todos los IDs existan en Integrant
        existing_integrant_ids = {
            id_ for id_, in db.execute(
                select(Integrant.id_integrant)
                .where(Integrant.id_integrant.in_(member_ids))
            )
        }
        missing = set(member_ids) - existing_integrant_ids
        if missing:
            raise ValueError(f"The following integrant IDs do not exist: {missing}")

        # Eliminar todos los miembros actuales del grupo
        db.execute(
            delete(models.group_integrant)
            .where(models.group_integrant.c.id_group == group_id)
        )

        # Insertar los nuevos miembros
        if member_ids:
            new_members = [
                {"id_group": group_id, "id_integrant": mid} for mid in member_ids
            ]
            db.execute(models.group_integrant.insert(), new_members)

    # --- Actualizar campos del grupo ---
    for key, value in data.items():
        # Saltamos 'member_ids' porque ya lo manejamos
        if key != "member_ids":
            setattr(db_group, key, value)

    db.commit()
    db.refresh(db_group)
    return db_group

def delete_group(db: Session, group_id: int):
    db_group = get_group(db, group_id)
    if not db_group:
        return None
    db.execute(
        models.group_integrant.delete().where(models.group_integrant.c.id_group == group_id)
    )
    db.delete(db_group)
    db.commit()
    return db_group

from sqlalchemy.orm import Session
from modules.faculty.models import Faculty
from sqlalchemy import func

def get_group_count_by_faculty(db: Session):
    """
    Devuelve una lista de dicts con:
      - faculty_name: nombre de la facultad
      - group_count: número de grupos en esa facultad
    """
    results = (
        db.query(
            Faculty.name.label("faculty_name"),
            func.count(models.Group.id_group).label("group_count")
        )
        .join(models.Group, Faculty.id_faculty == models.Group.id_faculty)
        .group_by(Faculty.id_faculty, Faculty.name)
        .all()
    )
    return [{"faculty_name": name, "group_count": count} for name, count in results]

from sqlalchemy.orm import Session
from . import models
  

def get_groups_with_member_count(db: Session):
    """
    Devuelve una lista de dicts con:
      - group_name: nombre del grupo
      - member_count: cantidad de integrantes en group_integrant
    """
    results = (
        db.query(
            models.Group.name.label("group_name"),
            func.count(models.group_integrant.c.id_integrant).label("member_count")
        )
        .join(models.group_integrant, models.Group.id_group == models.group_integrant.c.id_group)
        .group_by(models.Group.id_group, models.Group.name)
        .all()
    )
    return [{"group_name": name, "member_count": count} for name, count in results]