# monographs/models.py
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base


class Monograph(Base):
    __tablename__ = "monographs"

    id_monograph = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('monographs_id_monograph_seq')"
    )
    title = Column(String, nullable=False)
    isbn = Column(String, nullable=False)
    pages = Column(String, nullable=False)
    number = Column(String)
    month = Column(String)
    keywords = Column(String)
    resume = Column(String)
    cenda = Column(String)
    report_date = Column(Date)
    month_only = Column(Integer, default=1, nullable=False)
    year_only = Column(Integer, default=2009, nullable=False)
    id_country = Column(Integer, ForeignKey("countries.id_country"), nullable=True)
    id_project = Column(Integer)
    only_date = Column(Date)
    id_group = Column(Integer)
    publicated = Column(Boolean, default=False, nullable=False)

    # Relaciones
    country = relationship("Country", foreign_keys=[id_country])
    authors = relationship(
        "Integrant",
        secondary="monographs_authors",
        back_populates="monographs"
    )

# Tabla intermedia
monographs_authors = Table(
    "monographs_authors",
    Base.metadata,
    Column(
        "id_monograph_author",
        Integer,
        primary_key=True,
        server_default="nextval('monographs_authors_id_monograph_author_seq')"
    ),
    Column("id_monograph", Integer, ForeignKey("monographs.id_monograph")),
    Column("id_author", Integer, ForeignKey("integrant.id_integrant"))
)