from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from database import SessionLocal
from modules.auth.crud import get_current_user
from core.config import settings
from . import crud, schemas
from .entity_registry import (
    ENTITY_REGISTRY,
    _normalize_doi,
    apply_publication_doi_to_entity,
    build_metadata,
    build_storage_filename,
    entity_has_assigned_doi,
    get_entity_record,
)
from .service import ZenodoService, save_local_copy, validate_pdf_file


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


router = APIRouter(
    prefix="/zenodo",
    tags=["zenodo"],
)


def require_zenodo_permission(current_user=Depends(get_current_user)):
    allowed_roles = {
        role.strip().lower()
        for role in settings.ZENODO_ALLOWED_ROLES.split(",")
        if role.strip()
    }
    user_roles = {role.lower() for role in getattr(current_user, "roles_names", [])}

    # Admin siempre puede publicar en Zenodo
    if "ADMINISTRADOR" in user_roles:
        return current_user

    if not allowed_roles:
        return current_user

    if not user_roles.intersection(allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para publicar en Zenodo",
        )
    return current_user


@router.get("/entity-types", response_model=schemas.SupportedEntityTypesResponse)
def list_supported_entity_types():
    return {
        "entity_types": [
            schemas.EntityTypeInfo(
                entity_type=entity_type,
                label=config.label,
                endpoint_prefix=config.endpoint_prefix,
            )
            for entity_type, config in ENTITY_REGISTRY.items()
        ]
    }


@router.get("/publications", response_model=List[schemas.ZenodoPublication])
def list_publications(
    skip: int = 0,
    limit: int = 100,
    entity_type: Optional[schemas.EntityType] = Query(None),
    status_filter: Optional[schemas.PublicationStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    return crud.get_publications(
        db,
        skip=skip,
        limit=limit,
        entity_type=entity_type.value if entity_type else None,
        status=status_filter.value if status_filter else None,
    )


@router.get(
    "/publications/{entity_type}/{entity_id}",
    response_model=schemas.ZenodoPublication,
)
def get_entity_publication(
    entity_type: schemas.EntityType,
    entity_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    publication = crud.get_publication_by_entity(db, entity_type.value, entity_id)
    if publication is None:
        raise HTTPException(status_code=404, detail="Este registro aún no ha sido publicado en Zenodo")
    return publication


@router.post("/publish", response_model=schemas.ZenodoPublishResponse)
async def publish_to_zenodo(
    entity_type: schemas.EntityType = Form(...),
    entity_id: int = Form(...),
    publish: bool = Form(True, description="True para publicar; False para dejar solo borrador en Zenodo"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_zenodo_permission),
):
    existing = crud.get_publication_by_entity(db, entity_type.value, entity_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Este registro ya fue publicado en Zenodo",
                "doi": existing.doi,
                "zenodo_url": existing.zenodo_url,
            },
        )

    record = get_entity_record(db, entity_type, entity_id)
    if entity_has_assigned_doi(entity_type, record):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Este registro ya tiene un DOI asignado y no puede publicarse en Zenodo",
                "doi": _normalize_doi(getattr(record, "doi", None)),
            },
        )

    file_bytes = await file.read()
    original_filename = file.filename or "documento.pdf"
    validate_pdf_file(original_filename, file_bytes)

    storage_filename = build_storage_filename(entity_type, entity_id, original_filename)
    local_path = save_local_copy(entity_type.value, entity_id, storage_filename, file_bytes)

    publication = crud.create_publication(
        db=db,
        entity_type=entity_type.value,
        entity_id=entity_id,
        published_by=current_user.id_integrant,
        original_filename=original_filename,
        local_file_path=local_path,
    )

    zenodo = ZenodoService()
    try:
        deposition = zenodo.create_deposition()
        deposition_id = str(deposition["id"])
        bucket_url = deposition["links"]["bucket"]

        metadata_payload = build_metadata(entity_type, record)
        zenodo.update_deposition_metadata(deposition_id, metadata_payload)

        from io import BytesIO

        zenodo.upload_file(bucket_url, storage_filename, BytesIO(file_bytes))

        if publish:
            published = zenodo.publish_deposition(deposition_id)
            info = zenodo.extract_publication_info(published)
            publication = crud.mark_publication_published(db, publication, **info)
            apply_publication_doi_to_entity(
                db,
                entity_type,
                entity_id,
                info.get("doi"),
            )
            message = "Registro publicado exitosamente en Zenodo"
        else:
            publication.zenodo_deposition_id = deposition_id
            publication.status = schemas.PublicationStatus.draft.value
            db.commit()
            db.refresh(publication)
            message = "Borrador creado en Zenodo. Aún no está publicado."

    except HTTPException as exc:
        crud.mark_publication_failed(db, publication, str(exc.detail))
        raise
    except Exception as exc:
        crud.mark_publication_failed(db, publication, str(exc))
        raise HTTPException(status_code=500, detail="Error interno al publicar en Zenodo") from exc

    publication = crud.get_publication(db, publication.id_zenodo_publication)
    return schemas.ZenodoPublishResponse(publication=publication, message=message)
