# softwares/models.py
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base


class Software(Base):
    __tablename__ = "softwares"

    id_software = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('softwares_id_software_seq')"
    )
    title = Column(String, nullable=False)
    number = Column(String, nullable=False)
    yearfiled = Column(String, nullable=False)  # Nota: typo "yearfiled" → respetamos BD
    language = Column(String)
    assignee = Column(String)
    monthfield = Column(String)  # Nota: typo "monthfield" → respetamos BD
    keywords = Column(String)
    resume = Column(String)
    report_date = Column(Date)
    month_only = Column(Integer, default=1, nullable=False)
    year_only = Column(Integer, default=2009, nullable=False)
    id_country = Column(Integer, ForeignKey("countries.id_country"), nullable=True)
    is_conceded = Column(Boolean, default=False, nullable=False)
    id_project = Column(Integer)
    only_date = Column(Date)
    is_multimedia = Column(Boolean, default=False, nullable=False)
    id_group = Column(Integer)
    publicated = Column(Boolean, default=False, nullable=False)

    # Relaciones
    country = relationship("Country", foreign_keys=[id_country])
    authors = relationship(
        "Integrant",
        secondary="softwares_authors",
        back_populates="softwares"
    )

# Tabla intermedia
softwares_authors = Table(
    "softwares_authors",
    Base.metadata,
    Column(
        "id_software_author",
        Integer,
        primary_key=True,
        server_default="nextval('softwares_authors_id_software_author_seq')"
    ),
    Column("id_software", Integer, ForeignKey("softwares.id_software")),
    Column("id_author", Integer, ForeignKey("integrant.id_integrant"))
)