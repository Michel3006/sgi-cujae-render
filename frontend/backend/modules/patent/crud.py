# patents/crud.py
from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from . import models, schemas
from modules.country.crud import get_country
from modules.integrant.models import Integrant

def get_patent(db: Session, patent_id: int):
    return db.query(models.Patent).filter(models.Patent.id_patent == patent_id).first()

def get_patents(db: Session, skip: int = 0, limit: int = 100, author_id: Optional[int] = None, search: Optional[str] = None):
    query = db.query(models.Patent)
    
    if author_id is not None:
        query = query.join(models.Patent.authors).filter(Integrant.id_integrant == author_id)
    
    if search:
        search = f"%{search}%"
        query = query.filter(
            or_(
                models.Patent.title.ilike(search),
                models.Patent.reg_number.ilike(search),
                models.Patent.yearfiled.ilike(search),
                models.Patent.language.ilike(search),
                models.Patent.assignee.ilike(search),
                models.Patent.monthfield.ilike(search),
                models.Patent.keywords.ilike(search),
                models.Patent.resume.ilike(search)
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_patent(db: Session, patent: schemas.PatentCreate):
    # Validar país
    if patent.id_country and not get_country(db, patent.id_country):
        raise ValueError(f"Country with id {patent.id_country} does not exist")

    # Procesar autores: existentes vs nuevos
    author_ids_to_associate = []
    existing_author_ids = []
    new_authors_data = []

    for author in patent.author_ids:
        if isinstance(author, int):
            existing_author_ids.append(author)
        elif isinstance(author, schemas.NewAuthor):
            new_authors_data.append(author)
        else:
            raise ValueError("Invalid entry in author_ids: must be int or NewAuthor")

    # Validar autores existentes
    if existing_author_ids:
        existing_authors = db.query(Integrant).filter(
            models.Integrant.id_integrant.in_(existing_author_ids)
        ).all()
        if len(existing_authors) != len(existing_author_ids):
            raise ValueError("One or more existing author IDs do not exist")

    # Validar países de los autores nuevos
    new_country_ids = {a.id_country for a in new_authors_data}
    for country_id in new_country_ids:
        if not get_country(db, country_id):
            raise ValueError(f"Country with id {country_id} does not exist")

    # Crear la patente
    patent_data = patent.model_dump(exclude={"author_ids"})
    db_patent = models.Patent(**patent_data)
    db.add(db_patent)
    db.flush()  # Obtiene id_patent

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

    # Asociar todos los autores a la patente
    for author_id in author_ids_to_associate:
        db.execute(
            models.patents_authors.insert().values(
                id_patent=db_patent.id_patent,
                id_author=author_id
            )
        )

    db.commit()
    db.refresh(db_patent)
    return db_patent

def update_patent(db: Session, patent_id: int, patent_update: schemas.PatentUpdate):
    db_patent = get_patent(db, patent_id)
    if not db_patent:
        return None

    data = patent_update.model_dump(exclude_unset=True)

    if "id_country" in data and data["id_country"] is not None:
        if not get_country(db, data["id_country"]):
            raise ValueError(f"Country with id {data['id_country']} does not exist")

    for key, value in data.items():
        if key != "author_ids":
            setattr(db_patent, key, value)

    if "author_ids" in data and data["author_ids"] is not None:
        db.execute(
            models.patents_authors.delete().where(models.patents_authors.c.id_patent == patent_id)
        )
        aids = data["author_ids"]
        existing = db.query(Integrant).filter(Integrant.id_integrant.in_(aids)).all()
        if len(existing) != len(aids):
            raise ValueError("One or more author IDs do not exist")
        for aid in aids:
            db.execute(
                models.patents_authors.insert().values(
                    id_patent=patent_id,
                    id_author=aid
                )
            )

    db.commit()
    db.refresh(db_patent)
    return db_patent

def delete_patent(db: Session, patent_id: int):
    db_patent = get_patent(db, patent_id)
    if not db_patent:
        return None
    db.execute(
        models.patents_authors.delete().where(models.patents_authors.c.id_patent == patent_id)
    )
    db.delete(db_patent)
    db.commit()
    return db_patent

from sqlalchemy.orm import Session
from . import models

def get_patent_count_by_faculty(db: Session, faculty_id: int) -> dict:
    """
    Cuenta:
      - total_patents: todas las patentes
      - patents_in_faculty: patentes con al menos un autor de la facultad dada
    """
    # Total de patentes
    total_patents = db.query(models.Patent).count()

    # Patentes con al menos un autor de la facultad especificada
    patents_in_faculty = (
        db.query(models.Patent)
        .join(models.patents_authors)  # Patent → patents_authors
        .join(
            Integrant,
            models.patents_authors.c.id_author == Integrant.id_integrant
        )  # → Integrant
        .filter(models.Integrant.id_faculty == faculty_id)
        .distinct()  # Evita duplicados si una patente tiene varios autores de la misma facultad
        .count()
    )

    return {
        "total_patents": total_patents,
        "patents_in_faculty": patents_in_faculty
    }