from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base


class Norm(Base):
    __tablename__ = "norms"

    id_norm = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('norms_id_norm_seq')"
    )
    title = Column(String, nullable=False)
    registration_number = Column(String, nullable=False)
    pages = Column(String, nullable=False)
    keywords = Column(String)
    resume = Column(String)
    id_norm_type = Column(Integer, ForeignKey("norms_types.id_norm_type"), nullable=True)
    report_date = Column(Date)
    id_country = Column(Integer, ForeignKey("countries.id_country"), nullable=True)
    month_only = Column(Integer, default=1, nullable=False)
    year_only = Column(Integer, default=2009, nullable=False)
    id_project = Column(Integer)
    only_date = Column(Date)
    id_group = Column(Integer)
    publicated = Column(Boolean, default=False, nullable=False)

    # Relaciones
    country = relationship("Country", foreign_keys=[id_country])
    norm_type = relationship("NormType", foreign_keys=[id_norm_type])
    authors = relationship(
        "Integrant",
        secondary="norms_authors",
        back_populates="norms"
    )

# Tabla intermedia
norms_authors = Table(
    "norms_authors",
    Base.metadata,
    Column(
        "id_norm_author",
        Integer,
        primary_key=True,
        server_default="nextval('norms_authors_id_norm_author_seq')"
    ),
    Column("id_norm", Integer, ForeignKey("norms.id_norm")),
    Column("id_author", Integer, ForeignKey("integrant.id_integrant"))
)