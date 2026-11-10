# patents/models.py
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base


class Patent(Base):
    __tablename__ = "patents"

    id_patent = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('patents_id_patent_seq')"
    )
    title = Column(String, nullable=False)
    reg_number = Column(String, nullable=False)
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
    id_group = Column(Integer)
    publicated = Column(Boolean, default=False, nullable=False)

    # Relaciones
    country = relationship("Country", foreign_keys=[id_country])
    authors = relationship(
        "Integrant",
        secondary="patents_authors",
        back_populates="patents"
    )

# Tabla intermedia
patents_authors = Table(
    "patents_authors",
    Base.metadata,
    Column(
        "id_patent_author",
        Integer,
        primary_key=True,
        server_default="nextval('patents_authors_id_patent_author_seq')"
    ),
    Column("id_patent", Integer, ForeignKey("patents.id_patent")),
    Column("id_author", Integer, ForeignKey("integrant.id_integrant"))
)