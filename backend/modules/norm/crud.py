from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from . import models, schemas
from modules.country.crud import get_country
from modules.norm_type.crud import get_norm_type
from modules.integrant.models import Integrant


def get_norm(db: Session, norm_id: int):
    return (
        db.query(models.Norm)
        .options(
            joinedload(models.Norm.country),
            joinedload(models.Norm.norm_type),
            joinedload(models.Norm.authors),
        )
        .filter(models.Norm.id_norm == norm_id)
        .first()
    )

def get_norms(db: Session, skip: int = 0, limit: int = 100, author_id: Optional[int] = None, search: Optional[str] = None):
    query = db.query(models.Norm)
    
    if author_id is not None:
        query = query.join(models.Norm.authors).filter(Integrant.id_integrant == author_id)
    
    if search:
        search = f"%{search}%"
        query = query.filter(
            or_(
                models.Norm.title.ilike(search),
                models.Norm.registration_number.ilike(search),
                models.Norm.pages.ilike(search),
                models.Norm.keywords.ilike(search),
                models.Norm.resume.ilike(search)
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_norm(db: Session, norm: schemas.NormCreate):
    # Validar FKs
    if norm.id_country and not get_country(db, norm.id_country):
        raise ValueError(f"El país con id {norm.id_country} no existe")
    
    if norm.id_norm_type and not get_norm_type(db, norm.id_norm_type):
        raise ValueError(f"El tipo de norma con id {norm.id_norm_type} no existe")

    # Procesar autores: existentes vs nuevos
    author_ids_to_associate = []
    existing_author_ids = []
    new_authors_data = []

    for author in norm.author_ids:
        if isinstance(author, int):
            existing_author_ids.append(author)
        elif isinstance(author, schemas.NewAuthor):
            new_authors_data.append(author)
        else:
            raise ValueError("Entrada inválida en author_ids: debe ser int o NewAuthor")

    # Validar autores existentes
    if existing_author_ids:
        existing_authors = db.query(Integrant).filter(
            Integrant.id_integrant.in_(existing_author_ids)
        ).all()
        if len(existing_authors) != len(existing_author_ids):
            raise ValueError("Uno o más IDs de autores no existen")

    # Validar países de los autores nuevos
    new_country_ids = {a.id_country for a in new_authors_data}
    for country_id in new_country_ids:
        if not get_country(db, country_id):
            raise ValueError(f"El país con id {country_id} no existe")

    # Crear la norma
    norm_data = norm.model_dump(exclude={"author_ids"})
    db_norm = models.Norm(**norm_data)
    db.add(db_norm)
    db.flush()  # Obtiene id_norm

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

    # Asociar todos los autores a la norma
    for author_id in author_ids_to_associate:
        db.execute(
            models.norms_authors.insert().values(
                id_norm=db_norm.id_norm,
                id_author=author_id
            )
        )

    db.commit()
    return get_norm(db, db_norm.id_norm)

def update_norm(db: Session, norm_id: int, norm_update: schemas.NormUpdate):
    db_norm = get_norm(db, norm_id)
    if not db_norm:
        return None

    data = norm_update.model_dump(exclude_unset=True)

    if "id_country" in data and data["id_country"] is not None:
        if not get_country(db, data["id_country"]):
            raise ValueError(f"El país con id {data['id_country']} no existe")
    if "id_norm_type" in data and data["id_norm_type"] is not None:
        if not get_norm_type(db, data["id_norm_type"]):
            raise ValueError(f"El tipo de norma con id {data['id_norm_type']} no existe")

    for key, value in data.items():
        if key != "author_ids":
            setattr(db_norm, key, value)

    if "author_ids" in data and data["author_ids"] is not None:
        db.execute(
            models.norms_authors.delete().where(models.norms_authors.c.id_norm == norm_id)
        )
        aids = data["author_ids"]
        existing = db.query(Integrant).filter(Integrant.id_integrant.in_(aids)).all()
        if len(existing) != len(aids):
            raise ValueError("Uno o más IDs de autores no existen")
        for aid in aids:
            db.execute(
                models.norms_authors.insert().values(
                    id_norm=norm_id,
                    id_author=aid
                )
            )

    db.commit()
    return get_norm(db, norm_id)

def delete_norm(db: Session, norm_id: int):
    db_norm = get_norm(db, norm_id)
    if not db_norm:
        return None
    db.execute(
        models.norms_authors.delete().where(models.norms_authors.c.id_norm == norm_id)
    )
    db.delete(db_norm)
    db.commit()
    return db_norm

def get_norm_count_by_faculty(db: Session, faculty_id: int) -> dict:
    """
    Cuenta:
      - total_norms: todas las normas
      - norms_in_faculty: normas con al menos un autor de la facultad dada
    """
    # Total de normas
    total_norms = db.query(models.Norm).count()

    # Normas con al menos un autor de la facultad especificada
    norms_in_faculty = (
        db.query(models.Norm)
        .join(models.norms_authors)  # Norm → norms_authors
        .join(
            Integrant,
            models.norms_authors.c.id_author == Integrant.id_integrant
        )  # → Integrant
        .filter(Integrant.id_faculty == faculty_id)
        .distinct()  # Evita duplicados si una norma tiene varios autores de la misma facultad
        .count()
    )

    return {
        "total_norms": total_norms,
        "norms_in_faculty": norms_in_faculty
    }