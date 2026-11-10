from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ZenodoPublication(Base):
    __tablename__ = "zenodo_publications"

    id_zenodo_publication = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('zenodo_publications_id_zenodo_publication_seq')"
    )
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    zenodo_deposition_id = Column(String(50))
    zenodo_record_id = Column(String(50))
    zenodo_conceptrecid = Column(String(50))
    doi = Column(String(100))
    zenodo_url = Column(String(500))
    status = Column(String(20), nullable=False, default="draft")  # draft | published | failed
    local_file_path = Column(String(500))
    original_filename = Column(String(255))
    error_message = Column(Text)
    published_by = Column(Integer, ForeignKey("integrant.id_integrant"), nullable=True)
    published_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    publisher = relationship("Integrant", foreign_keys=[published_by])
