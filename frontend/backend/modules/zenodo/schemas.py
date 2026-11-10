from enum import Enum
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class EntityType(str, Enum):
    article = "article"
    book = "book"
    prize = "prize"
    norm = "norm"
    monograph = "monograph"
    thesis = "thesis"
    patent = "patent"
    software = "software"
    encounter = "encounter"


class PublicationStatus(str, Enum):
    draft = "draft"
    published = "published"
    failed = "failed"


class PublisherSummary(BaseModel):
    id_integrant: int
    name: str
    email: Optional[str] = None

    class Config:
        from_attributes = True


class ZenodoPublicationBase(BaseModel):
    entity_type: EntityType
    entity_id: int
    zenodo_deposition_id: Optional[str] = None
    zenodo_record_id: Optional[str] = None
    zenodo_conceptrecid: Optional[str] = None
    doi: Optional[str] = None
    zenodo_url: Optional[str] = None
    status: PublicationStatus = PublicationStatus.draft
    local_file_path: Optional[str] = None
    original_filename: Optional[str] = None
    error_message: Optional[str] = None


class ZenodoPublication(ZenodoPublicationBase):
    id_zenodo_publication: int
    published_by: Optional[int] = None
    publisher: Optional[PublisherSummary] = None
    published_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ZenodoPublishResponse(BaseModel):
    publication: ZenodoPublication
    message: str


class EntityTypeInfo(BaseModel):
    entity_type: EntityType
    label: str
    endpoint_prefix: str


class SupportedEntityTypesResponse(BaseModel):
    entity_types: List[EntityTypeInfo]
