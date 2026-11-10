# theses/models.py
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base


class Thesis(Base):
    __tablename__ = "theses"

    id_thesis = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('theses_id_thesis_seq')"
    )
    title = Column(String, nullable=False)
    institution = Column(String, nullable=False)
    keywords = Column(String)
    resume = Column(String)
    id_thesis_type = Column(Integer, ForeignKey("theses_types.id_thesis_type"), nullable=True)
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
    thesis_type = relationship("ThesisType", foreign_keys=[id_thesis_type])
    
    # Autores
    authors = relationship(
        "Integrant",
        secondary="theses_authors",
        back_populates="theses_as_author"
    )
    
    # Tutores
    tutors = relationship(
        "Integrant",
        secondary="theses_tutors",
        back_populates="theses_as_tutor"
    )

# Tablas intermedias
# Tabla para autores de tesis
theses_authors = Table(
    "theses_authors",
    Base.metadata,
    Column(
        "id_thesis_author",
        Integer,
        primary_key=True,
        server_default="nextval('theses_authors_id_thesis_author_seq')"
    ),
    Column("id_thesis", Integer, ForeignKey("theses.id_thesis")),
    Column("id_author", Integer, ForeignKey("integrant.id_integrant"))
)

# Tabla para tutores de tesis
theses_tutors = Table(
    "theses_tutors",
    Base.metadata,
    Column(
        "id_thesis_tutor",
        Integer,
        primary_key=True,
        server_default="nextval('theses_tutors_id_thesis_tutor_seq')"
    ),
    Column("id_thesis", Integer, ForeignKey("theses.id_thesis")),
    Column("id_author", Integer, ForeignKey("integrant.id_integrant"))
)