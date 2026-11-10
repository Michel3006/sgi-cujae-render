from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from . import models, schemas
from modules.country.crud import get_country
from modules.article_type.crud import get_article_type
from modules.integrant.models import Integrant
from modules.zenodo import crud as zenodo_crud


def _normalize_doi(doi: Optional[str]) -> Optional[str]:
    if not doi or not str(doi).strip():
        return None
    value = str(doi).strip()
    lower = value.lower()
    if lower.startswith("https://doi.org/"):
        return value[len("https://doi.org/") :]
    if lower.startswith("http://doi.org/"):
        return value[len("http://doi.org/") :]
    if lower.startswith("doi:"):
        return value[4:].strip()
    return value


def get_article(db: Session, article_id: int):
    
    return (
        db.query(models.Article)
        .options(
            joinedload(models.Article.country),
            joinedload(models.Article.article_type),
            joinedload(models.Article.authors),
        )
        .filter(models.Article.id_article == article_id)
        .first()
    )

from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional

def get_articles(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = None,
    search: Optional[str] = None
):
    query = db.query(models.Article)

    # Si hay búsqueda o filtro por autor, hacemos join con los autores
    if search is not None or author_id is not None:
        query = query.join(models.Article.authors)  # Relación muchos-a-muchos

    # Filtro por author_id
    if author_id is not None:
        query = query.filter(Integrant.id_integrant == author_id)

    # Búsqueda en campos del artículo + nombre del autor
    if search is not None:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.Article.title.ilike(term),
                models.Article.journal.ilike(term),
                models.Article.voulume.ilike(term),  # ← ¿quizás "volume"?
                models.Article.pages.ilike(term),
                models.Article.number.ilike(term),
                models.Article.keywords.ilike(term),
                models.Article.doi.ilike(term),
                models.Article.resume.ilike(term),
                models.Article.issn.ilike(term),
                # 👇 Búsqueda en el nombre del integrante (autor)
                Integrant.name.ilike(term)
            )
        )

    # Evitar duplicados cuando hay varios autores
    if search is not None or author_id is not None:
        query = query.distinct()

    return query.offset(skip).limit(limit).all()

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from typing import List, Union

def create_article(db: Session, article: schemas.ArticleCreate):
    # Validar que DOI o ISSN no existan ya
    if article.doi or article.issn:
        conflict_query = db.query(models.Article)
        conditions = []

        if article.doi:
            conditions.append(models.Article.doi == article.doi)
        if article.issn:
            conditions.append(models.Article.issn == article.issn)

        conflict_query = conflict_query.filter(or_(*conditions))
        existing = conflict_query.first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An article with the same DOI or ISSN already exists"
            )

    # Validar FKs principales
    if article.id_country and not get_country(db, article.id_country):
        raise ValueError(f"Country with id {article.id_country} does not exist")
    
    if article.id_article_type and not get_article_type(db, article.id_article_type):
        raise ValueError(f"Article type with id {article.id_article_type} does not exist")

    # Procesar autores: separar existentes y nuevos
    author_ids_to_associate = []
    existing_author_ids = []
    new_authors_data = []

    for author in article.author_ids:
        if isinstance(author, int):
            existing_author_ids.append(author)
        elif isinstance(author, schemas.NewAuthor):
            new_authors_data.append(author)
        else:
            raise ValueError("Invalid author entry in author_ids")

    # Validar autores existentes
    if existing_author_ids:
        existing_authors = db.query(Integrant).filter(
            Integrant.id_integrant.in_(existing_author_ids)
        ).all()
        if len(existing_authors) != len(existing_author_ids):
            raise ValueError("One or more existing author IDs do not exist")

    # Validar que los países de los autores nuevos existan
    new_country_ids = {a.id_country for a in new_authors_data}
    for country_id in new_country_ids:
        if not get_country(db, country_id):
            raise ValueError(f"Country with id {country_id} does not exist")

    # Crear el artículo (sin autores aún)
    article_data = article.model_dump(exclude={"author_ids"})
    db_article = models.Article(**article_data)
    db.add(db_article)
    db.flush()  # Obtiene id_article

    # Crear autores nuevos y recolectar sus IDs
    for new_author in new_authors_data:
        db_new_author = Integrant(
            name=new_author.name,
            work_center=new_author.work_center,
            email=new_author.email,
            id_country=new_author.id_country,
            external=True  # asumimos que son externos
        )
        db.add(db_new_author)
        db.flush()  # Necesario para obtener el id_integrant
        author_ids_to_associate.append(db_new_author.id_integrant)

    # Añadir IDs de autores existentes
    author_ids_to_associate.extend(existing_author_ids)

    # Asociar todos los autores al artículo
    for author_id in author_ids_to_associate:
        db.execute(
            models.articles_authors.insert().values(
                id_article=db_article.id_article,
                id_author=author_id
            )
        )
    
    db.commit()
    db.refresh(db_article)
    return db_article
def update_article(db: Session, article_id: int, article_update: schemas.ArticleUpdate):
    db_article = get_article(db, article_id)
    if not db_article:
        return None

    update_data = article_update.model_dump(exclude_unset=True)

    if "doi" in update_data:
        current_doi = _normalize_doi(db_article.doi)
        requested_doi = _normalize_doi(update_data.get("doi"))
        zenodo_publication = zenodo_crud.get_publication_by_entity(db, "article", article_id)
        if zenodo_publication:
            if requested_doi != current_doi:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No se puede modificar el DOI de un registro publicado en Zenodo",
                )
            update_data.pop("doi", None)
        elif current_doi and requested_doi != current_doi:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No se puede modificar el DOI de un artículo que ya tiene DOI asignado",
            )

    # Validar FKs
    if "id_country" in update_data and update_data["id_country"] is not None:
        if not get_country(db, update_data["id_country"]):
            raise ValueError(f"Country with id {update_data['id_country']} does not exist")
    if "id_article_type" in update_data and update_data["id_article_type"] is not None:
        if not get_article_type(db, update_data["id_article_type"]):
            raise ValueError(f"Article type with id {update_data['id_article_type']} does not exist")

    # Actualizar campos simples
    for key, value in update_data.items():
        if key != "author_ids":
            setattr(db_article, key, value)

    # Actualizar autores
    if "author_ids" in update_data and update_data["author_ids"] is not None:
        db.execute(
            models.articles_authors.delete().where(models.articles_authors.c.id_article == article_id)
        )
        author_ids = update_data["author_ids"]
        existing_authors = db.query(Integrant).filter(Integrant.id_integrant.in_(author_ids)).all()
        if len(existing_authors) != len(author_ids):
            raise ValueError("One or more author IDs do not exist")
        for author_id in author_ids:
            db.execute(
                models.articles_authors.insert().values(
                    id_article=article_id,
                    id_author=author_id,
                )
            )

    db.commit()
    db.refresh(db_article)
    return db_article

def delete_article(db: Session, article_id: int):
    db_article = get_article(db, article_id)
    if not db_article:
        return None
    db.execute(
        models.articles_authors.delete().where(models.articles_authors.c.id_article == article_id)
    )
    db.delete(db_article)
    db.commit()
    return db_article

def get_article_count_by_faculty(db: Session, faculty_id: int) -> dict:
    """
    Cuenta:
      - total_articles: todos los artículos
      - articles_in_faculty: artículos con al menos un autor de la facultad dada
    """
    # Total de artículos
    total_articles = db.query(models.Article).count()

    # Artículos con al menos un autor de la facultad especificada
    articles_in_faculty = (
        db.query(models.Article)
        .join(models.articles_authors)  # Article → articles_authors
        .join(Integrant, models.articles_authors.c.id_author == Integrant.id_integrant)  # → Integrant
        .filter(Integrant.id_faculty == faculty_id)
        .distinct()  # Evita duplicados si un artículo tiene varios autores de la misma facultad
        .count()
    )

    return {
        "total_articles": total_articles,
        "articles_in_faculty": articles_in_faculty
    }