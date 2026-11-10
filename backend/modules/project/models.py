# project/models.py
from sqlalchemy import Column, Integer, String, Date, Boolean, Numeric, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base
  # Asumimos que existe

class Project(Base):
    __tablename__ = "project"

    id_project = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('project_id_project_seq')"
    )
    title = Column(String, nullable=False)
    code = Column(String, nullable=False)
    id_responsible = Column(Integer, ForeignKey("integrant.id_integrant"), nullable=True)
    thematic = Column(String)
    id_project_type = Column(Integer, ForeignKey("project_type.id_project_type"), nullable=True)
    art_state = Column(String)
    cientific_problem = Column(String)
    study_object = Column(String)
    study_field = Column(String)
    hypothesis = Column(String)
    main_objective = Column(String)
    research_methods = Column(String)
    interested_third_party = Column(String)
    national_group = Column(String)
    international_group = Column(String)
    publish_magazine = Column(String)
    participate_events = Column(String)
    citma_code = Column(String)
    minvec_code = Column(String)
    approved = Column(Boolean, default=False)
    conseil_criteria = Column(String)
    initial_date = Column(Date)
    final_date = Column(Date)
    update_date = Column(Date)
    id_project_state = Column(Integer, ForeignKey("project_state.id_project_state"), nullable=True)
    id_project_classification = Column(Integer, ForeignKey("project_classification.id_project_classification"), nullable=True)
    economic_budget = Column(String)
    economic_needs = Column(String)
    id_faculty = Column(Integer, ForeignKey("faculty.id_faculty"), nullable=True)
    concluded = Column(Boolean, default=False)
    approved_date = Column(Date)
    general_budget_cup = Column(Numeric)
    year_budget_cup = Column(Numeric)
    is_international = Column(Boolean, default=False, nullable=False)
    is_national = Column(Boolean, default=False, nullable=False)
    is_territorial = Column(Boolean, default=False, nullable=False)
    is_cujae = Column(Boolean, default=False, nullable=False)
    keywords = Column(String, nullable=True)

    # Relaciones
    responsible = relationship("Integrant", foreign_keys=[id_responsible])
    project_type = relationship("ProjectType", foreign_keys=[id_project_type])
    project_state = relationship("ProjectState", foreign_keys=[id_project_state])
    project_classification = relationship("ProjectClassification", foreign_keys=[id_project_classification])
    faculty = relationship("Faculty", foreign_keys=[id_faculty])

    # Miembros (muchos a muchos con admin)
    members = relationship(
        "Integrant",
        secondary="project_integrant",
        back_populates="projects_as_member"
    )

    # Palabras clave

# Tablas intermedias
project_integrant = Table(
    "project_integrant",
    Base.metadata,
    Column(
        "id_project_integrant",
        Integer,
        primary_key=True,
        server_default="nextval('project_integrant_id_project_integrant_seq')"
    ),
    Column("id_project", Integer, ForeignKey("project.id_project"), nullable=False),
    Column("id_integrant", Integer, ForeignKey("integrant.id_integrant"), nullable=False),
    Column("admin", Boolean, default=False, nullable=False)
    
    
)

