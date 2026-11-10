from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from . import models, schemas
from modules.country.crud import get_country
from modules.encounter_type.crud import get_encounter_type
from modules.integrant.models import Integrant

def get_encounter(db: Session, encounter_id: int):
    return db.query(models.Encounter).filter(models.Encounter.id_encounter == encounter_id).first()

def get_encounters(db: Session, skip: int = 0, limit: int = 100, author_id: Optional[int] = None, search: Optional[str] = None):
    query = db.query(models.Encounter)
    
    if author_id is not None:
        query = query.join(models.Encounter.authors).filter(Integrant.id_integrant == author_id)
    
    if search:
        search = f"%{search}%"
        query = query.filter(
            or_(
                models.Encounter.title.ilike(search),
                models.Encounter.encounter_name.ilike(search),
                models.Encounter.keywords.ilike(search),
                models.Encounter.resume.ilike(search),
                models.Encounter.isbn.ilike(search),
                models.Encounter.city.ilike(search),
                models.Encounter.issn.ilike(search),
                models.Encounter.organizer.ilike(search)
            )
        )
    
    return query.offset(skip).limit(limit).all()

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

def create_encounter(db: Session, encounter: schemas.EncounterCreate):
    # 🔍 Validar unicidad de ISBN y/o ISSN
    if encounter.isbn or encounter.issn:
        conflict_query = db.query(models.Encounter)
        conditions = []

        if encounter.isbn and encounter.isbn.strip():
            conditions.append(models.Encounter.isbn == encounter.isbn.strip())
        if encounter.issn and encounter.issn.strip():
            conditions.append(models.Encounter.issn == encounter.issn.strip())

        if conditions:
            existing = conflict_query.filter(or_(*conditions)).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An encounter with the same ISBN or ISSN already exists"
                )

    # Validar FKs
    if encounter.id_country and not get_country(db, encounter.id_country):
        raise ValueError(f"Country with id {encounter.id_country} does not exist")
    
    if encounter.id_encounter_type and not get_encounter_type(db, encounter.id_encounter_type):
        raise ValueError(f"Encounter type with id {encounter.id_encounter_type} does not exist")

    # Procesar autores: existentes vs nuevos
    author_ids_to_associate = []
    existing_author_ids = []
    new_authors_data = []

    for author in encounter.author_ids:
        if isinstance(author, int):
            existing_author_ids.append(author)
        elif isinstance(author, schemas.NewAuthor):
            new_authors_data.append(author)
        else:
            raise ValueError("Invalid entry in author_ids: must be int or NewAuthor")

    # Validar autores existentes
    if existing_author_ids:
        existing_authors = db.query(Integrant).filter(
            Integrant.id_integrant.in_(existing_author_ids)
        ).all()
        if len(existing_authors) != len(existing_author_ids):
            raise ValueError("One or more existing author IDs do not exist")

    # Validar países de los autores nuevos
    new_country_ids = {a.id_country for a in new_authors_data}
    for country_id in new_country_ids:
        if not get_country(db, country_id):
            raise ValueError(f"Country with id {country_id} does not exist")

    # Crear el encuentro
    encounter_data = encounter.model_dump(exclude={"author_ids"})
    db_encounter = models.Encounter(**encounter_data)
    db.add(db_encounter)
    db.flush()  # Obtiene id_encounter

    # Crear autores nuevos
    for new_author in new_authors_data:
        db_new_author = Integrant(
            name=new_author.name,
            work_center=new_author.work_center,
            email=new_author.email,
            id_country=new_author.id_country,
            external=True  # asumimos autores nuevos = externos
        )
        db.add(db_new_author)
        db.flush()  # necesario para obtener id_integrant
        author_ids_to_associate.append(db_new_author.id_integrant)

    # Añadir autores existentes
    author_ids_to_associate.extend(existing_author_ids)

    # Asociar todos los autores al encuentro
    for author_id in author_ids_to_associate:
        db.execute(
            models.encounters_authors.insert().values(
                id_encounter=db_encounter.id_encounter,
                id_author=author_id
            )
        )

    db.commit()
    db.refresh(db_encounter)
    return db_encounter

def update_encounter(db: Session, encounter_id: int, encounter_update: schemas.EncounterUpdate):
    db_enc = get_encounter(db, encounter_id)
    if not db_enc:
        return None

    data = encounter_update.model_dump(exclude_unset=True)

    if "id_country" in data and data["id_country"] is not None:
        if not get_country(db, data["id_country"]):
            raise ValueError(f"Country with id {data['id_country']} does not exist")
    if "id_encounter_type" in data and data["id_encounter_type"] is not None:
        if not get_encounter_type(db, data["id_encounter_type"]):
            raise ValueError(f"Encounter type with id {data['id_encounter_type']} does not exist")

    for key, value in data.items():
        if key != "author_ids":
            setattr(db_enc, key, value)

    if "author_ids" in data and data["author_ids"] is not None:
        db.execute(
            models.encounters_authors.delete().where(models.encounters_authors.c.id_encounter == encounter_id)
        )
        aids = data["author_ids"]
        existing = db.query(Integrant).filter(Integrant.id_integrant.in_(aids)).all()
        if len(existing) != len(aids):
            raise ValueError("One or more author IDs do not exist")
        for aid in aids:
            db.execute(
                models.encounters_authors.insert().values(
                    id_encounter=encounter_id,
                    id_author=aid,
                )
            )

    db.commit()
    db.refresh(db_enc)
    return db_enc

def delete_encounter(db: Session, encounter_id: int):
    db_enc = get_encounter(db, encounter_id)
    if not db_enc:
        return None
    db.execute(
        models.encounters_authors.delete().where(models.encounters_authors.c.id_encounter == encounter_id)
    )
    db.delete(db_enc)
    db.commit()
    return db_enc

from typing import Dict
from sqlalchemy.orm import Session
from . import models

def get_encounter_count_by_faculty(db: Session, faculty_id: int) -> Dict[str, int]:
    """
    Cuenta:
      - total_encounters: todos los eventos
      - encounters_in_faculty: eventos con al menos un autor de la facultad dada
    """
    # Total de eventos
    total_encounters = db.query(models.Encounter).count()

    # Eventos con al menos un autor de la facultad especificada
    encounters_in_faculty = (
        db.query(models.Encounter)
        .join(models.encounters_authors)  # Encounter → encounters_authors
        .join(Integrant, models.encounters_authors.c.id_author == Integrant.id_integrant)  # → Integrant
        .filter(Integrant.id_faculty == faculty_id)
        .distinct()
        .count()
    )

    return {
        "total_encounters": total_encounters,
        "encounters_in_faculty": encounters_in_faculty
    }