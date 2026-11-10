# theses/crud.py
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas
from modules.country.crud import get_country
from modules.theses_type.crud import get_thesis_type
from modules.integrant.models import Integrant

def get_thesis(db: Session, thesis_id: int):
    return db.query(models.Thesis).filter(models.Thesis.id_thesis == thesis_id).first()

def get_theses(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = None,
    tutor_id: Optional[int] = None,
    search: Optional[str] = None
):
    query = db.query(models.Thesis)
    
    if author_id is not None:
        query = query.join(models.Thesis.authors).filter(Integrant.id_integrant == author_id)
    
    if tutor_id is not None:
        query = query.join(models.Thesis.tutors).filter(Integrant.id_integrant == tutor_id)
    
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.Thesis.title.ilike(term),
                models.Thesis.institution.ilike(term),
                models.Thesis.keywords.ilike(term),
                models.Thesis.resume.ilike(term)
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_thesis(db: Session, thesis: schemas.ThesisCreate):
    # Validar FKs principales
    if thesis.id_country and not get_country(db, thesis.id_country):
        raise ValueError(f"Country with id {thesis.id_country} does not exist")
    
    if thesis.id_thesis_type and not get_thesis_type(db, thesis.id_thesis_type):
        raise ValueError(f"Thesis type with id {thesis.id_thesis_type} does not exist")

    # Extraer y clasificar autores y tutores
    all_new_authors = []
    all_new_tutors = []
    existing_author_ids = []
    existing_tutor_ids = []

    # Procesar autores
    for author in thesis.author_ids:
        if isinstance(author, int):
            existing_author_ids.append(author)
        elif isinstance(author, schemas.NewAuthor):
            all_new_authors.append(author)
        else:
            raise ValueError("Invalid entry in author_ids: must be int or NewAuthor")

    # Procesar tutores
    for tutor in thesis.tutor_ids:
        if isinstance(tutor, int):
            existing_tutor_ids.append(tutor)
        elif isinstance(tutor, schemas.NewAuthor):
            all_new_tutors.append(tutor)
        else:
            raise ValueError("Invalid entry in tutor_ids: must be int or NewAuthor")

    # Validar países de todos los nuevos autores/tutores
    all_new_people = all_new_authors + all_new_tutors
    new_country_ids = {p.id_country for p in all_new_people}
    for country_id in new_country_ids:
        if not get_country(db, country_id):
            raise ValueError(f"Country with id {country_id} does not exist")

    # Validar IDs existentes combinados
    all_existing_ids = set(existing_author_ids + existing_tutor_ids)
    if all_existing_ids:
        existing_integrants = db.query(Integrant).filter(
            Integrant.id_integrant.in_(all_existing_ids)
        ).all()
        if len(existing_integrants) != len(all_existing_ids):
            raise ValueError("One or more author/tutor IDs do not exist")

    # Crear la tesis
    thesis_data = thesis.model_dump(exclude={"author_ids", "tutor_ids"})
    db_thesis = models.Thesis(**thesis_data)
    db.add(db_thesis)
    db.flush()  # Obtiene id_thesis

    # Crear nuevos autores y recolectar sus IDs
    author_ids_to_associate = []
    for new_author in all_new_authors:
        db_new = Integrant(
            name=new_author.name,
            work_center=new_author.work_center,
            email=new_author.email,
            id_country=new_author.id_country,
            external=True
        )
        db.add(db_new)
        db.flush()
        author_ids_to_associate.append(db_new.id_integrant)

    # Añadir autores existentes
    author_ids_to_associate.extend(existing_author_ids)

    # Crear nuevos tutores y recolectar sus IDs
    tutor_ids_to_associate = []
    for new_tutor in all_new_tutors:
        db_new = Integrant(
            name=new_tutor.name,
            work_center=new_tutor.work_center,
            email=new_tutor.email,
            id_country=new_tutor.id_country,
            external=True
        )
        db.add(db_new)
        db.flush()
        tutor_ids_to_associate.append(db_new.id_integrant)

    # Añadir tutores existentes
    tutor_ids_to_associate.extend(existing_tutor_ids)

    # Asociar autores
    for aid in author_ids_to_associate:
        db.execute(
            models.theses_authors.insert().values(
                id_thesis=db_thesis.id_thesis,
                id_author=aid
            )
        )

    # Asociar tutores
    for tid in tutor_ids_to_associate:
        db.execute(
            models.theses_tutors.insert().values(
                id_thesis=db_thesis.id_thesis,
                id_author=tid
            )
        )

    db.commit()
    db.refresh(db_thesis)
    return db_thesis

def update_thesis(db: Session, thesis_id: int, thesis_update: schemas.ThesisUpdate):
    db_thesis = get_thesis(db, thesis_id)
    if not db_thesis:
        return None

    data = thesis_update.model_dump(exclude_unset=True)

    # Validar FKs
    if "id_country" in data and data["id_country"] is not None:
        if not get_country(db, data["id_country"]):
            raise ValueError(f"Country with id {data['id_country']} does not exist")
    if "id_thesis_type" in data and data["id_thesis_type"] is not None:
        if not get_thesis_type(db, data["id_thesis_type"]):
            raise ValueError(f"Thesis type with id {data['id_thesis_type']} does not exist")

    # Actualizar campos simples
    for key, value in data.items():
        if key not in {"author_ids", "tutor_ids"}:
            setattr(db_thesis, key, value)

    # Actualizar autores
    if "author_ids" in data and data["author_ids"] is not None:
        db.execute(
            models.theses_authors.delete().where(models.theses_authors.c.id_thesis == thesis_id)
        )
        for aid in data["author_ids"]:
            db.execute(
                models.theses_authors.insert().values(
                    id_thesis=thesis_id,
                    id_author=aid
                )
            )

    # Actualizar tutores
    if "tutor_ids" in data and data["tutor_ids"] is not None:
        db.execute(
            models.theses_tutors.delete().where(models.theses_tutors.c.id_thesis == thesis_id)
        )
        for tid in data["tutor_ids"]:
            db.execute(
                models.theses_tutor.insert().values(
                    id_thesis=thesis_id,
                    id_author=tid
                )
            )

    db.commit()
    db.refresh(db_thesis)
    return db_thesis

def delete_thesis(db: Session, thesis_id: int):
    db_thesis = get_thesis(db, thesis_id)
    if not db_thesis:
        return None
    db.execute(models.theses_authors.delete().where(models.theses_authors.c.id_thesis == thesis_id))
    db.execute(models.theses_tutor.delete().where(models.theses_tutors.c.id_thesis == thesis_id))
    db.delete(db_thesis)
    db.commit()
    return db_thesis

from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models

def get_thesis_count_by_faculty(db: Session, faculty_id: int) -> dict:
    """
    Cuenta:
      - total_theses: todas las tesis
      - theses_in_faculty: tesis con al menos un autor O tutor de la facultad dada
    """
    # Total de tesis
    total_theses = db.query(models.Thesis).count()

    # Subconsulta: tesis con autores de la facultad
    theses_by_authors = (
        db.query(models.Thesis.id_thesis)
        .join(models.theses_authors)
        .join(Integrant, models.theses_authors.c.id_author == Integrant.id_integrant)
        .filter(Integrant.id_faculty == faculty_id)
    )

    # Subconsulta: tesis con tutores de la facultad
    theses_by_tutors = (
        db.query(models.Thesis.id_thesis)
        .join(models.theses_tutors)
        .join(Integrant, models.theses_tutors.c.id_author == Integrant.id_integrant)
        .filter(Integrant.id_faculty == faculty_id)
    )

    # Combinar ambas listas (UNIÓN) y contar IDs únicos
    thesis_ids_in_faculty = theses_by_authors.union(theses_by_tutors).subquery()
    theses_in_faculty = db.query(thesis_ids_in_faculty).count()

    return {
        "total_theses": total_theses,
        "theses_in_faculty": theses_in_faculty
    }