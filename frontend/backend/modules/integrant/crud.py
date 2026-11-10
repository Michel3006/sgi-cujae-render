from typing import Optional
from sqlalchemy import insert
from sqlalchemy.orm import Session
from sqlalchemy.orm import load_only
from . import models, schemas

# Importamos los CRUDs para validar existencia
from modules.country.crud import get_country
from modules.docent_degree.crud import get_docent_degree
from modules.cientific_degree.crud import get_cientific_degree
from modules.faculty.crud import get_faculty
from modules.faculty_area.crud import get_faculty_area
from modules.general_category.crud import get_general_category
from modules.roles.crud import get_role  # ← Asegúrate de tener esta importación


from sqlalchemy.orm import joinedload

def get_integrant(db: Session, integrant_id: int):
    return (
        db.query(models.Integrant)
        .options(
            joinedload(models.Integrant.roles),  # ← Carga los roles en la misma consulta
            joinedload(models.Integrant.country),
            joinedload(models.Integrant.docent_degree),
            joinedload(models.Integrant.cientific_degree),
            joinedload(models.Integrant.faculty),
            joinedload(models.Integrant.faculty_area),
            joinedload(models.Integrant.general_category),
        )
        .filter(models.Integrant.id_integrant == integrant_id)
        .first()
    )

def get_integrants(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    query = db.query(models.Integrant).options(
        joinedload(models.Integrant.roles),
        joinedload(models.Integrant.country),
        joinedload(models.Integrant.docent_degree),
        joinedload(models.Integrant.cientific_degree),
        joinedload(models.Integrant.faculty),
        joinedload(models.Integrant.faculty_area),
        joinedload(models.Integrant.general_category),
    )
    
    if search:
        query = query.filter(models.Integrant.name.ilike(f"%{search}%"))
    
    return query.offset(skip).limit(limit).all()


def create_integrant(db: Session, integrant: schemas.IntegrantCreate):
    # Validar FKs solo si se proporcionan
    if integrant.id_country is not None and not get_country(db, integrant.id_country):
        raise ValueError(f"Country with id {integrant.id_country} does not exist")
    if integrant.id_docent_degree is not None and not get_docent_degree(db, integrant.id_docent_degree):
        raise ValueError(f"Docent degree with id {integrant.id_docent_degree} does not exist")
    if integrant.id_cientific_degree is not None and not get_cientific_degree(db, integrant.id_cientific_degree):
        raise ValueError(f"Cientific degree with id {integrant.id_cientific_degree} does not exist")
    if integrant.id_faculty is not None and not get_faculty(db, integrant.id_faculty):
        raise ValueError(f"Faculty with id {integrant.id_faculty} does not exist")
    if integrant.id_faculty_area is not None and not get_faculty_area(db, integrant.id_faculty_area):
        raise ValueError(f"Faculty area with id {integrant.id_faculty_area} does not exist")
    if integrant.id_general_category is not None and not get_general_category(db, integrant.id_general_category):
        raise ValueError(f"General category with id {integrant.id_general_category} does not exist")

    # Validar que los roles existan
    if integrant.roles_list is not None:
        for role_id in integrant.roles_list:
            if not get_role(db, role_id):
                raise ValueError(f"Role with id {role_id} does not exist")

    # Crear el integrante (excluyendo roles_list, que no es columna de la tabla)
    integrant_data = integrant.model_dump(exclude={"roles_list"})
    db_integrant = models.Integrant(**integrant_data)
    db.add(db_integrant)
    db.commit()
    db.refresh(db_integrant)  # Obtiene el id_integrant generado

    # Asociar roles en la tabla intermedia
    if integrant.roles_list is not None:
        role_entries = [
            {
                "id_role": role_id,
                "id_integrant": db_integrant.id_integrant
            }
            for role_id in integrant.roles_list
        ]
        if role_entries:
            db.execute(insert(models.integrant_role), role_entries)
            db.commit()
            # Opcional: refrescar para cargar relaciones si usas .roles después
            db.refresh(db_integrant)

    return db_integrant


def update_integrant(db: Session, integrant_id: int, integrant_update: schemas.IntegrantUpdate):
    db_integrant = get_integrant(db, integrant_id)
    if not db_integrant:
        return None

    update_data = integrant_update.model_dump(exclude_unset=True)

    # Validar FKs si se están actualizando
    if "id_country" in update_data and update_data["id_country"] is not None:
        if not get_country(db, update_data["id_country"]):
            raise ValueError(f"Country with id {update_data['id_country']} does not exist")
    if "id_docent_degree" in update_data and update_data["id_docent_degree"] is not None:
        if not get_docent_degree(db, update_data["id_docent_degree"]):
            raise ValueError(f"Docent degree with id {update_data['id_docent_degree']} does not exist")
    if "id_cientific_degree" in update_data and update_data["id_cientific_degree"] is not None:
        if not get_cientific_degree(db, update_data["id_cientific_degree"]):
            raise ValueError(f"Cientific degree with id {update_data['id_cientific_degree']} does not exist")
    if "id_faculty" in update_data and update_data["id_faculty"] is not None:
        if not get_faculty(db, update_data["id_faculty"]):
            raise ValueError(f"Faculty with id {update_data['id_faculty']} does not exist")
    if "id_faculty_area" in update_data and update_data["id_faculty_area"] is not None:
        if not get_faculty_area(db, update_data["id_faculty_area"]):
            raise ValueError(f"Faculty area with id {update_data['id_faculty_area']} does not exist")
    if "id_general_category" in update_data and update_data["id_general_category"] is not None:
        if not get_general_category(db, update_data["id_general_category"]):
            raise ValueError(f"General category with id {update_data['id_general_category']} does not exist")

    # Validar roles si se están actualizando
    if "roles_list" in update_data and update_data["roles_list"] is not None:
        for role_id in update_data["roles_list"]:
            if not get_role(db, role_id):
                raise ValueError(f"Role with id {role_id} does not exist")

    # Actualizar campos simples
    for key, value in update_data.items():
        if key != "roles_list":  # roles_list se maneja aparte
            setattr(db_integrant, key, value)

    # Actualizar roles si se proporcionaron
    if "roles_list" in update_data:
        # Borrar roles antiguos
        db.execute(
            models.integrant_role.delete()
            .where(models.integrant_role.c.id_integrant == integrant_id)
        )
        # Insertar nuevos roles
        if update_data["roles_list"]:
            new_roles = [
                {"id_role": rid, "id_integrant": integrant_id}
                for rid in update_data["roles_list"]
            ]
            db.execute(insert(models.integrant_role), new_roles)

    db.commit()
    db.refresh(db_integrant)
    return db_integrant


def delete_integrant(db: Session, integrant_id: int):
    db_integrant = get_integrant(db, integrant_id)
    if not db_integrant:
        return None
    db.delete(db_integrant)
    db.commit()
    return db_integrant