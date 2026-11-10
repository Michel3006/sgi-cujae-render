# softwares/crud.py
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas
from modules.country.crud import get_country
from modules.integrant.models import Integrant

def get_software(db: Session, software_id: int):
    return db.query(models.Software).filter(models.Software.id_software == software_id).first()

def get_softwares(db: Session, skip: int = 0, limit: int = 100, author_id: Optional[int] = None, search: Optional[str] = None):
    query = db.query(models.Software)
    
    if author_id is not None:
        query = query.join(models.Software.authors).filter(Integrant.id_integrant == author_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Software.title.ilike(search_term),
                models.Software.number.ilike(search_term),
                models.Software.yearfiled.ilike(search_term),
                models.Software.language.ilike(search_term),
                models.Software.assignee.ilike(search_term),
                models.Software.monthfield.ilike(search_term),
                models.Software.keywords.ilike(search_term),
                models.Software.resume.ilike(search_term)
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_software(db: Session, software: schemas.SoftwareCreate):
    # Validar país
    if software.id_country and not get_country(db, software.id_country):
        raise ValueError(f"Country with id {software.id_country} does not exist")

    # Procesar autores: existentes vs nuevos
    author_ids_to_associate = []
    existing_author_ids = []
    new_authors_data = []

    for author in software.author_ids:
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

    # Crear el software
    software_data = software.model_dump(exclude={"author_ids"})
    db_software = models.Software(**software_data)
    db.add(db_software)
    db.flush()  # Obtiene id_software

    # Crear autores nuevos
    for new_author in new_authors_data:
        db_new_author = Integrant(
            name=new_author.name,
            work_center=new_author.work_center,
            email=new_author.email,
            id_country=new_author.id_country,
            external=True  # autores nuevos se consideran externos
        )
        db.add(db_new_author)
        db.flush()  # necesario para obtener id_integrant
        author_ids_to_associate.append(db_new_author.id_integrant)

    # Añadir autores existentes
    author_ids_to_associate.extend(existing_author_ids)

    # Asociar todos los autores al software
    for author_id in author_ids_to_associate:
        db.execute(
            models.softwares_authors.insert().values(
                id_software=db_software.id_software,
                id_author=author_id
            )
        )

    db.commit()
    db.refresh(db_software)
    return db_software

def update_software(db: Session, software_id: int, software_update: schemas.SoftwareUpdate):
    db_software = get_software(db, software_id)
    if not db_software:
        return None

    data = software_update.model_dump(exclude_unset=True)

    if "id_country" in data and data["id_country"] is not None:
        if not get_country(db, data["id_country"]):
            raise ValueError(f"Country with id {data['id_country']} does not exist")

    for key, value in data.items():
        if key != "author_ids":
            setattr(db_software, key, value)

    if "author_ids" in data and data["author_ids"] is not None:
        db.execute(
            models.softwares_authors.delete().where(models.softwares_authors.c.id_software == software_id)
        )
        aids = data["author_ids"]
        existing = db.query(Integrant).filter(Integrant.id_integrant.in_(aids)).all()
        if len(existing) != len(aids):
            raise ValueError("One or more author IDs do not exist")
        for aid in aids:
            db.execute(
                models.softwares_authors.insert().values(
                    id_software=software_id,
                    id_author=aid,
                )
            )

    db.commit()
    db.refresh(db_software)
    return db_software

def delete_software(db: Session, software_id: int):
    db_software = get_software(db, software_id)
    if not db_software:
        return None
    db.execute(
        models.softwares_authors.delete().where(models.softwares_authors.c.id_software == software_id)
    )
    db.delete(db_software)
    db.commit()
    return db_software

from sqlalchemy.orm import Session
from . import models

def get_software_count_by_faculty(db: Session, faculty_id: int) -> dict:
    """
    Cuenta:
      - total_softwares: todos los softwares
      - softwares_in_faculty: softwares con al menos un autor de la facultad dada
    """
    # Total de softwares
    total_softwares = db.query(models.Software).count()

    # Softwares con al menos un autor de la facultad especificada
    softwares_in_faculty = (
        db.query(models.Software)
        .join(models.softwares_authors)  # Software → softwares_authors
        .join(
            models.Integrant,
            models.softwares_authors.c.id_author == Integrant.id_integrant
        )  # → Integrant
        .filter(Integrant.id_faculty == faculty_id)
        .distinct()  # Evita duplicados si un software tiene varios autores de la misma facultad
        .count()
    )

    return {
        "total_softwares": total_softwares,
        "softwares_in_faculty": softwares_in_faculty
    }