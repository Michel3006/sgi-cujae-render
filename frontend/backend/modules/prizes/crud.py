# prizes/crud.py
from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from . import models, schemas
from modules.country.crud import get_country
from modules.prizes_type.crud import get_prize_type
from modules.integrant.models import Integrant
from sqlalchemy.orm import joinedload

def get_prize(db: Session, prize_id: int):
    return (
        db.query(models.Prize)
        .options(
            joinedload(models.Prize.country),
            joinedload(models.Prize.prize_type),
            # Opcional: joinedload(models.Prize.authors) si también lo usas
        )
        .filter(models.Prize.id_prize == prize_id)
        .first()
    )

def get_prizes(db: Session, skip: int = 0, limit: int = 100, author_id: Optional[int] = None, search: Optional[str] = None):
    query = db.query(models.Prize)
    
    if author_id is not None:
        query = query.join(models.Prize.authors).filter(Integrant.id_integrant == author_id)
    
    if search:
        search = f"%{search}%"
        query = query.filter(
            or_(
                models.Prize.title.ilike(search),
                models.Prize.grant_institution.ilike(search),
                models.Prize.keywords.ilike(search),
                models.Prize.resume.ilike(search)
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_prize(db: Session, prize: schemas.PrizeCreate):
    # Validar FKs
    if prize.id_country and not get_country(db, prize.id_country):
        raise ValueError(f"Country with id {prize.id_country} does not exist")
    
    if prize.id_prize_type and not get_prize_type(db, prize.id_prize_type):
        raise ValueError(f"Prize type with id {prize.id_prize_type} does not exist")

    # Procesar autores: existentes vs nuevos
    author_ids_to_associate = []
    existing_author_ids = []
    new_authors_data = []

    for author in prize.author_ids:
        if isinstance(author, int):
            existing_author_ids.append(author)
        elif isinstance(author, schemas.NewAuthor):
            new_authors_data.append(author)
        else:
            raise ValueError("Invalid entry in author_ids: must be int or NewAuthor")

    # Validar autores existentes
    if existing_author_ids:
        existing_authors = db.query(models.Integrant).filter(
            Integrant.id_integrant.in_(existing_author_ids)
        ).all()
        if len(existing_authors) != len(existing_author_ids):
            raise ValueError("One or more existing author IDs do not exist")

    # Validar países de los autores nuevos
    new_country_ids = {a.id_country for a in new_authors_data}
    for country_id in new_country_ids:
        if not get_country(db, country_id):
            raise ValueError(f"Country with id {country_id} does not exist")

    # Crear el premio
    prize_data = prize.model_dump(exclude={"author_ids"})
    db_prize = models.Prize(**prize_data)
    db.add(db_prize)
    db.flush()  # Obtiene id_prize

    # Crear autores nuevos
    for new_author in new_authors_data:
        db_new_author = Integrant(
            name=new_author.name,
            work_center=new_author.work_center,
            email=new_author.email,
            id_country=new_author.id_country,
            external=True  # autores nuevos se marcan como externos
        )
        db.add(db_new_author)
        db.flush()  # necesario para obtener id_integrant
        author_ids_to_associate.append(db_new_author.id_integrant)

    # Añadir autores existentes
    author_ids_to_associate.extend(existing_author_ids)

    # Asociar todos los autores al premio
    for author_id in author_ids_to_associate:
        db.execute(
            models.prizes_authors.insert().values(
                id_prize=db_prize.id_prize,
                id_author=author_id
            )
        )

    db.commit()
    db.refresh(db_prize)
    return db_prize

def update_prize(db: Session, prize_id: int, prize_update: schemas.PrizeUpdate):
    db_prize = get_prize(db, prize_id)
    if not db_prize:
        return None

    data = prize_update.model_dump(exclude_unset=True)

    if "id_country" in data and data["id_country"] is not None:
        if not get_country(db, data["id_country"]):
            raise ValueError(f"Country with id {data['id_country']} does not exist")
    if "id_prize_type" in data and data["id_prize_type"] is not None:
        if not get_prize_type(db, data["id_prize_type"]):
            raise ValueError(f"Prize type with id {data['id_prize_type']} does not exist")

    for key, value in data.items():
        if key != "author_ids":
            setattr(db_prize, key, value)

    if "author_ids" in data and data["author_ids"] is not None:
        db.execute(
            models.prizes_authors.delete().where(models.prizes_authors.c.id_prize == prize_id)
        )
        aids = data["author_ids"]
        existing = db.query(Integrant).filter(Integrant.id_integrant.in_(aids)).all()
        if len(existing) != len(aids):
            raise ValueError("One or more author IDs do not exist")
        for aid in aids:
            db.execute(
                models.prizes_authors.insert().values(
                    id_prize=prize_id,
                    id_author=aid
                )
            )

    db.commit()
    db.refresh(db_prize)
    return db_prize

def delete_prize(db: Session, prize_id: int):
    db_prize = get_prize(db, prize_id)
    if not db_prize:
        return None
    db.delete(db_prize)
    db.commit()
    return db_prize

from sqlalchemy.orm import Session
from . import models

def get_prize_count_by_faculty(db: Session, faculty_id: int) -> dict:
    """
    Cuenta:
      - total_prizes: todos los premios
      - prizes_in_faculty: premios con al menos un autor de la facultad dada
    """
    # Total de premios
    total_prizes = db.query(models.Prize).count()

    # Premios con al menos un autor de la facultad especificada
    prizes_in_faculty = (
        db.query(models.Prize)
        .join(models.prizes_authors)  # Prize → prizes_authors
        .join(
            Integrant,
            models.prizes_authors.c.id_author == Integrant.id_integrant
        )  # → Integrant
        .filter(Integrant.id_faculty == faculty_id)
        .distinct()  # Evita duplicados si un premio tiene varios autores de la misma facultad
        .count()
    )

    return {
        "total_prizes": total_prizes,
        "prizes_in_faculty": prizes_in_faculty
    }