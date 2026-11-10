# monographs/crud.py
from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from . import models, schemas
from modules.country.crud import get_country
from modules.integrant.models import Integrant

def get_monograph(db: Session, monograph_id: int):
    return db.query(models.Monograph).filter(models.Monograph.id_monograph == monograph_id).first()

def get_monographs(db: Session, skip: int = 0, limit: int = 100, author_id: Optional[int] = None, search: Optional[str] = None):
    query = db.query(models.Monograph)
    
    if author_id is not None:
        query = query.join(models.Monograph.authors).filter(Integrant.id_integrant == author_id)
    
    if search:
        search = f"%{search}%"
        query = query.filter(
            or_(
                models.Monograph.title.ilike(search),
                models.Monograph.isbn.ilike(search),
                models.Monograph.pages.ilike(search),
                models.Monograph.number.ilike(search),
                models.Monograph.month.ilike(search),
                models.Monograph.keywords.ilike(search),
                models.Monograph.resume.ilike(search),
                models.Monograph.cenda.ilike(search)
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_monograph(db: Session, monograph: schemas.MonographCreate):
    # Validar país si se envía
    if monograph.id_country and not get_country(db, monograph.id_country):
        raise ValueError(f"Country with id {monograph.id_country} does not exist")
    
    # Validar autores
    if monograph.author_ids:
        existing_authors = db.query(Integrant).filter(Integrant.id_integrant.in_(monograph.author_ids)).all()
        if len(existing_authors) != len(monograph.author_ids):
            raise ValueError("One or more author IDs do not exist")

    db_monograph = models.Monograph(**monograph.model_dump(exclude={"author_ids"}))
    db.add(db_monograph)
    db.flush()  # Obtener id_monograph sin commitear

    # Asociar autores
    if monograph.author_ids:
        for author_id in monograph.author_ids:
            db.execute(
                models.monographs_authors.insert().values(
                    id_monograph=db_monograph.id_monograph,
                    id_author=author_id
                )
            )
    db.commit()
    db.refresh(db_monograph)
    return db_monograph

def update_monograph(db: Session, monograph_id: int, monograph_update: schemas.MonographUpdate):
    db_monograph = get_monograph(db, monograph_id)
    if not db_monograph:
        return None

    update_data = monograph_update.model_dump(exclude_unset=True)

    # Validar país si se actualiza
    if "id_country" in update_data and update_data["id_country"] is not None:
        if not get_country(db, update_data["id_country"]):
            raise ValueError(f"Country with id {update_data['id_country']} does not exist")

    # Actualizar campos simples
    for key, value in update_data.items():
        if key != "author_ids":
            setattr(db_monograph, key, value)

    # Actualizar autores si se proporcionan
    if "author_ids" in update_data and update_data["author_ids"] is not None:
        # Eliminar relaciones anteriores
        db.execute(
            models.monographs_authors.delete().where(models.monographs_authors.c.id_monograph == monograph_id)
        )
        # Validar nuevos autores
        author_ids = update_data["author_ids"]
        existing_authors = db.query(Integrant).filter(Integrant.id_integrant.in_(author_ids)).all()
        if len(existing_authors) != len(author_ids):
            raise ValueError("One or more author IDs do not exist")
        # Insertar nuevas relaciones
        for author_id in author_ids:
            db.execute(
                models.monographs_authors.insert().values(
                    id_monograph=monograph_id,
                    id_author=author_id
                )
            )

    db.commit()
    db.refresh(db_monograph)
    return db_monograph

def delete_monograph(db: Session, monograph_id: int):
    db_monograph = get_monograph(db, monograph_id)
    if not db_monograph:
        return None
    # Eliminar relaciones
    db.execute(
        models.monographs_authors.delete().where(models.monographs_authors.c.id_monograph == monograph_id)
    )
    db.delete(db_monograph)
    db.commit()
    return db_monograph

from sqlalchemy.orm import Session
from . import models  # Ajusta la ruta según tu estructura

def get_monograph_count_by_faculty(db: Session, faculty_id: int) -> dict:
    """
    Cuenta:
      - total_monographs: todas las monografías
      - monographs_in_faculty: monografías con al menos un autor de la facultad dada
    """
    # Total de monografías
    total_monographs = db.query(models.Monograph).count()

    # Monografías con al menos un autor de la facultad especificada
    monographs_in_faculty = (
        db.query(models.Monograph)
        .join(models.monographs_authors)  # Monograph → monographs_authors
        .join(
            Integrant,
            models.monographs_authors.c.id_author == Integrant.id_integrant
        )  # → Integrant
        .filter(Integrant.id_faculty == faculty_id)
        .distinct()  # Evita duplicados si una monografía tiene varios autores de la misma facultad
        .count()
    )

    return {
        "total_monographs": total_monographs,
        "monographs_in_faculty": monographs_in_faculty
    }