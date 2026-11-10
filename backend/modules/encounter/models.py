from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base



class Encounter(Base):
    __tablename__ = "encounters"

    id_encounter = Column(Integer, primary_key=True, index=True, server_default="nextval('encounters_id_encounter_seq')")
    title = Column(String, nullable=False)
    encounter_name = Column(String, nullable=False)
    keywords = Column(String)
    resume = Column(String)
    id_encounter_type = Column(Integer, ForeignKey("encounters_types.id_encounter_type"), nullable=True)
    report_date = Column(Date)
    isbn = Column(String)
    city = Column(String)
    issn = Column(String)
    organizer = Column(String)
    id_country = Column(Integer, ForeignKey("countries.id_country"), nullable=True)
    month_only = Column(Integer, default=1, nullable=False)
    year_only = Column(Integer, default=2009, nullable=False)
    id_project = Column(Integer)
    only_date = Column(Date)
    id_group = Column(Integer)
    publicated = Column(Boolean, default=False, nullable=False)

    # Relaciones
    country = relationship("Country", foreign_keys=[id_country])
    encounter_type = relationship("EncounterType", foreign_keys=[id_encounter_type])
    authors = relationship(
        "Integrant",
        secondary="encounters_authors",
        back_populates="encounters"
    )

# Tabla intermedia
encounters_authors = Table(
    "encounters_authors",
    Base.metadata,
    Column(
        "id_encounter_author",
        Integer,
        primary_key=True,
        server_default="nextval('encounters_authors_id_encounter_author_seq')"
    ),
    Column("id_encounter", Integer, ForeignKey("encounters.id_encounter")),
    Column("id_author", Integer, ForeignKey("integrant.id_integrant"))
)

# modules/encounters/crud.py
