from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Callable, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from modules.articles import crud as article_crud
from modules.book import crud as book_crud
from modules.encounter import crud as encounter_crud
from modules.monographs import crud as monograph_crud
from modules.norm import crud as norm_crud
from modules.patent import crud as patent_crud
from modules.prizes import crud as prize_crud
from modules.software import crud as software_crud
from modules.theses import crud as thesis_crud
from .schemas import EntityType


DEFAULT_AFFILIATION = "Universidad Tecnológica José Antonio Echeverría (CUJAE)"


@dataclass
class EntityConfig:
    label: str
    endpoint_prefix: str
    fetch: Callable[[Session, int], Any]
    metadata_builder: Callable[[Any], dict]


def _parse_keywords(keywords: Optional[str]) -> List[str]:
    if not keywords:
        return []
    return [part.strip() for part in keywords.split(",") if part.strip()]


def _publication_date(record: Any) -> str:
    year = getattr(record, "year_only", None) or 2009
    month = getattr(record, "month_only", None) or 1
    try:
        month = max(1, min(12, int(month)))
        year = int(year)
    except (TypeError, ValueError):
        return "2009-01-01"
    return date(year, month, 1).isoformat()


def _creators_from_authors(record: Any) -> List[dict]:
    authors = getattr(record, "authors", None) or []
    if not authors:
        return [{"name": "CUJAE", "affiliation": DEFAULT_AFFILIATION}]

    creators = []
    for author in authors:
        creator = {
            "name": author.name,
            "affiliation": author.work_center or DEFAULT_AFFILIATION,
        }
        creators.append(creator)
    return creators


def _base_metadata(
    record: Any,
    *,
    upload_type: str,
    publication_type: Optional[str] = None,
    extra: Optional[dict] = None,
) -> dict:
    metadata = {
        "upload_type": upload_type,
        "title": getattr(record, "title", "Sin título"),
        "description": getattr(record, "resume", None) or "Registro científico publicado desde el sistema integrado CUJAE.",
        "creators": _creators_from_authors(record),
        "keywords": _parse_keywords(getattr(record, "keywords", None)),
        "publication_date": _publication_date(record),
        "access_right": "open",
        "license": "cc-by-4.0",
    }

    if publication_type:
        metadata["publication_type"] = publication_type

    doi = getattr(record, "doi", None)
    if doi:
        metadata["doi"] = doi

    if extra:
        metadata.update(extra)

    return metadata


def _build_article_metadata(record: Any) -> dict:
    journal = {
        "title": record.journal,
        "pages": record.pages,
    }
    if record.issn:
        journal["journal_issn"] = record.issn
    if record.number:
        journal["issue"] = record.number
    if record.voulume:
        journal["volume"] = record.voulume

    return _base_metadata(
        record,
        upload_type="publication",
        publication_type="article",
        extra={"journal": journal},
    )


def _build_book_metadata(record: Any) -> dict:
    publication_type = "section" if getattr(record, "is_chapter", False) else "book"
    extra = {}
    if record.isbn:
        extra["imprint"] = {"isbn": record.isbn}
    if record.publisher:
        extra.setdefault("imprint", {})["publisher"] = record.publisher
    return _base_metadata(
        record,
        upload_type="publication",
        publication_type=publication_type,
        extra=extra,
    )


def _build_prize_metadata(record: Any) -> dict:
    return _base_metadata(
        record,
        upload_type="publication",
        publication_type="report",
        extra={
            "notes": f"Institución otorgante: {record.grant_institution}",
        },
    )


def _build_norm_metadata(record: Any) -> dict:
    return _base_metadata(
        record,
        upload_type="publication",
        publication_type="technicalnote",
        extra={
            "notes": f"Número de registro: {record.registration_number}. Páginas: {record.pages}.",
        },
    )


def _build_monograph_metadata(record: Any) -> dict:
    extra = {"imprint": {"isbn": record.isbn, "pages": record.pages}}
    return _base_metadata(
        record,
        upload_type="publication",
        publication_type="book",
        extra=extra,
    )


def _build_thesis_metadata(record: Any) -> dict:
    return _base_metadata(
        record,
        upload_type="publication",
        publication_type="thesis",
        extra={
            "notes": f"Institución: {record.institution}",
        },
    )


def _build_patent_metadata(record: Any) -> dict:
    return _base_metadata(
        record,
        upload_type="publication",
        publication_type="patent",
        extra={
            "notes": f"Número de registro: {record.reg_number}. Año: {record.yearfiled}.",
        },
    )


def _build_software_metadata(record: Any) -> dict:
    return _base_metadata(
        record,
        upload_type="software",
        extra={
            "notes": f"Número: {record.number}. Titular: {record.assignee or 'CUJAE'}.",
        },
    )


def _build_encounter_metadata(record: Any) -> dict:
    extra = {
        "notes": (
            f"Evento: {record.encounter_name}. "
            f"Organizador: {record.organizer or 'N/D'}. "
            f"Ciudad: {record.city or 'N/D'}."
        )
    }
    if record.isbn:
        extra["imprint"] = {"isbn": record.isbn}
    return _base_metadata(
        record,
        upload_type="publication",
        publication_type="conferencepaper",
        extra=extra,
    )


ENTITY_REGISTRY: dict[EntityType, EntityConfig] = {
    EntityType.article: EntityConfig(
        label="Artículo",
        endpoint_prefix="/articles",
        fetch=article_crud.get_article,
        metadata_builder=_build_article_metadata,
    ),
    EntityType.book: EntityConfig(
        label="Libro",
        endpoint_prefix="/books",
        fetch=book_crud.get_book,
        metadata_builder=_build_book_metadata,
    ),
    EntityType.prize: EntityConfig(
        label="Premio",
        endpoint_prefix="/prizes",
        fetch=prize_crud.get_prize,
        metadata_builder=_build_prize_metadata,
    ),
    EntityType.norm: EntityConfig(
        label="Norma",
        endpoint_prefix="/norms",
        fetch=norm_crud.get_norm,
        metadata_builder=_build_norm_metadata,
    ),
    EntityType.monograph: EntityConfig(
        label="Monografía",
        endpoint_prefix="/monographs",
        fetch=monograph_crud.get_monograph,
        metadata_builder=_build_monograph_metadata,
    ),
    EntityType.thesis: EntityConfig(
        label="Tesis",
        endpoint_prefix="/theses",
        fetch=thesis_crud.get_thesis,
        metadata_builder=_build_thesis_metadata,
    ),
    EntityType.patent: EntityConfig(
        label="Patente",
        endpoint_prefix="/patents",
        fetch=patent_crud.get_patent,
        metadata_builder=_build_patent_metadata,
    ),
    EntityType.software: EntityConfig(
        label="Software",
        endpoint_prefix="/softwares",
        fetch=software_crud.get_software,
        metadata_builder=_build_software_metadata,
    ),
    EntityType.encounter: EntityConfig(
        label="Evento científico",
        endpoint_prefix="/encounters",
        fetch=encounter_crud.get_encounter,
        metadata_builder=_build_encounter_metadata,
    ),
}


def get_entity_config(entity_type: EntityType) -> EntityConfig:
    config = ENTITY_REGISTRY.get(entity_type)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de entidad no soportado: {entity_type}",
        )
    return config


def get_entity_record(db: Session, entity_type: EntityType, entity_id: int) -> Any:
    config = get_entity_config(entity_type)
    record = config.fetch(db, entity_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró {entity_type.value} con id {entity_id}",
        )
    return record


def build_metadata(entity_type: EntityType, record: Any) -> dict:
    config = get_entity_config(entity_type)
    return {"metadata": config.metadata_builder(record)}


def build_storage_filename(entity_type: EntityType, entity_id: int, original_filename: str) -> str:
    safe_name = original_filename.replace("\\", "_").replace("/", "_")
    return f"{entity_type.value}_{entity_id}_{safe_name}"


def entity_has_assigned_doi(entity_type: EntityType, record: Any) -> bool:
    """Artículos con DOI ya están publicados y no deben re-publicarse en Zenodo."""
    if entity_type != EntityType.article:
        return False
    return _normalize_doi(getattr(record, "doi", None)) is not None


def _normalize_doi(doi: Optional[str]) -> Optional[str]:
    if not doi or not str(doi).strip():
        return None
    value = str(doi).strip()
    if value.lower().startswith("https://doi.org/"):
        return value[len("https://doi.org/") :]
    if value.lower().startswith("http://doi.org/"):
        return value[len("http://doi.org/") :]
    if value.lower().startswith("doi:"):
        return value[4:].strip()
    return value


def apply_publication_doi_to_entity(
    db: Session,
    entity_type: EntityType,
    entity_id: int,
    doi: Optional[str],
) -> None:
    """
    Tras publicar en Zenodo, persiste el DOI en el registro de origen.
    Actualmente solo los artículos tienen campo `doi` en la base de datos.
    """
    normalized = _normalize_doi(doi)
    if not normalized:
        return

    if entity_type != EntityType.article:
        return

    from modules.articles import schemas as article_schemas

    article_crud.update_article(
        db,
        entity_id,
        article_schemas.ArticleUpdate(doi=normalized),
    )
