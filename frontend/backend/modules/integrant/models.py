# integrant/models.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base
from modules.prizes.models import prizes_authors
from modules.articles.models import articles_authors
from modules.book.models import books_authors
from modules.encounter.models import encounters_authors
from modules.monographs.models import monographs_authors
from modules.norm.models import norms_authors
from modules.patent.models import patents_authors
from modules.software.models import softwares_authors
from modules.theses.models import theses_authors, theses_tutors
from modules.group.models import group_integrant
from modules.project.models import project_integrant


# Tabla intermedia para roles
integrant_role = Table(
    "integrant_role",
    Base.metadata,
    Column("id_integrant_role", Integer, primary_key=True),
    Column("id_role", Integer, ForeignKey("roles.id_rol"), primary_key=False),
    Column("id_integrant", Integer, ForeignKey("integrant.id_integrant"), primary_key=False),
)

class Integrant(Base):
    __tablename__ = "integrant"

    id_integrant = Column(Integer, primary_key=True, index=True, server_default="nextval('integrant_id_integrant_seq')")
    name = Column(String, nullable=False)
    identity = Column(String, nullable=True)
    external = Column(Boolean, default=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    available_time = Column(Integer, nullable=True)
    work_center = Column(String, nullable=True)
    curriculum = Column(String, nullable=True)
    id_faculty_area = Column(Integer, ForeignKey("faculties_areas.id_faculty_area"), nullable=True)
    id_cientific_degree = Column(Integer, ForeignKey("cientific_degree.id_cientific_degree"), nullable=True)
    id_country = Column(Integer, ForeignKey("countries.id_country"), nullable=True)
    id_faculty = Column(Integer, ForeignKey("faculty.id_faculty"), nullable=True)
    id_docent_degree = Column(Integer, ForeignKey("docent_degree.id_docent_degree"), nullable=True)
    id_general_category = Column(Integer, ForeignKey("general_category.id_general_category"), nullable=True)

    # Relaciones (solo para cargar datos relacionados, no obligatorias)
    country = relationship("Country", foreign_keys=[id_country])
    docent_degree = relationship("DocentDegree", foreign_keys=[id_docent_degree])
    cientific_degree = relationship("CientificDegree", foreign_keys=[id_cientific_degree])
    faculty = relationship("Faculty", foreign_keys=[id_faculty])
    faculty_area = relationship("FacultyArea", foreign_keys=[id_faculty_area])
    general_category = relationship("GeneralCategory", foreign_keys=[id_general_category])

    # Relaciones muchos a muchos
    roles = relationship("Role", secondary=integrant_role, back_populates="integrants")
    articles = relationship("Article", secondary=articles_authors, back_populates="authors")
    books = relationship("Book", secondary=books_authors, back_populates="authors")
    encounters = relationship("Encounter", secondary=encounters_authors, back_populates="authors")
    monographs = relationship("Monograph", secondary=monographs_authors, back_populates="authors")
    norms = relationship("Norm", secondary=norms_authors, back_populates="authors")
    patents = relationship("Patent", secondary=patents_authors, back_populates="authors")
    prizes = relationship("Prize", secondary= prizes_authors, back_populates="authors")
    softwares = relationship("Software", secondary=softwares_authors, back_populates="authors")
    theses_as_author = relationship("Thesis", secondary=theses_authors, back_populates="authors")
    theses_as_tutor = relationship("Thesis", secondary=theses_tutors, back_populates="tutors")
    groups = relationship("Group", secondary=group_integrant, back_populates="members")
    projects_as_member = relationship("Project", secondary=project_integrant, back_populates="members")