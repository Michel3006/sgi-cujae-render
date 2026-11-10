from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from . import models, schemas


def get_publication(db: Session, publication_id: int) -> Optional[models.ZenodoPublication]:
    return (
        db.query(models.ZenodoPublication)
        .options(joinedload(models.ZenodoPublication.publisher))
        .filter(models.ZenodoPublication.id_zenodo_publication == publication_id)
        .first()
    )


def get_publication_by_entity(
    db: Session,
    entity_type: str,
    entity_id: int,
) -> Optional[models.ZenodoPublication]:
    return (
        db.query(models.ZenodoPublication)
        .options(joinedload(models.ZenodoPublication.publisher))
        .filter(
            models.ZenodoPublication.entity_type == entity_type,
            models.ZenodoPublication.entity_id == entity_id,
            models.ZenodoPublication.status == schemas.PublicationStatus.published.value,
        )
        .order_by(models.ZenodoPublication.published_at.desc())
        .first()
    )


def get_publications(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    entity_type: Optional[str] = None,
    status: Optional[str] = None,
) -> List[models.ZenodoPublication]:
    query = db.query(models.ZenodoPublication).options(
        joinedload(models.ZenodoPublication.publisher)
    )

    if entity_type:
        query = query.filter(models.ZenodoPublication.entity_type == entity_type)
    if status:
        query = query.filter(models.ZenodoPublication.status == status)

    return (
        query.order_by(models.ZenodoPublication.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_publication(
    db: Session,
    entity_type: str,
    entity_id: int,
    published_by: int,
    original_filename: str,
    local_file_path: str,
) -> models.ZenodoPublication:
    publication = models.ZenodoPublication(
        entity_type=entity_type,
        entity_id=entity_id,
        published_by=published_by,
        original_filename=original_filename,
        local_file_path=local_file_path,
        status=schemas.PublicationStatus.draft.value,
    )
    db.add(publication)
    db.commit()
    db.refresh(publication)
    return publication


def mark_publication_published(
    db: Session,
    publication: models.ZenodoPublication,
    *,
    zenodo_deposition_id: str,
    zenodo_record_id: Optional[str],
    zenodo_conceptrecid: Optional[str],
    doi: Optional[str],
    zenodo_url: Optional[str],
) -> models.ZenodoPublication:
    publication.zenodo_deposition_id = zenodo_deposition_id
    publication.zenodo_record_id = zenodo_record_id
    publication.zenodo_conceptrecid = zenodo_conceptrecid
    publication.doi = doi
    publication.zenodo_url = zenodo_url
    publication.status = schemas.PublicationStatus.published.value
    publication.published_at = datetime.now(timezone.utc)
    publication.error_message = None
    db.commit()
    db.refresh(publication)
    return publication


def mark_publication_failed(
    db: Session,
    publication: models.ZenodoPublication,
    error_message: str,
) -> models.ZenodoPublication:
    publication.status = schemas.PublicationStatus.failed.value
    publication.error_message = error_message
    db.commit()
    db.refresh(publication)
    return publication
