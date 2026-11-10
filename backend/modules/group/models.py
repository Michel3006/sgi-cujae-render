# group/models.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from database import Base


class Group(Base):
    __tablename__ = "group"  # Nombre entre comillas en BD, pero SQLAlchemy lo maneja

    id_group = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('group_id_group_seq')"
    )
    name = Column(String, nullable=False)
    subjects = Column(String, nullable=False)
    problems = Column(String, nullable=False)
    id_faculty_area = Column(Integer, ForeignKey("faculties_areas.id_faculty_area"), nullable=True)
    id_admin = Column(Integer, ForeignKey("integrant.id_integrant"), nullable=False)  # Líder
    id_faculty = Column(Integer, ForeignKey("faculty.id_faculty"), nullable=False)
    create_date = Column(DateTime, nullable=False)
    update_date = Column(DateTime, nullable=False)

    # Relaciones
    leader = relationship("Integrant", foreign_keys=[id_admin])
    faculty = relationship("Faculty", foreign_keys=[id_faculty])
    faculty_area = relationship("FacultyArea", foreign_keys=[id_faculty_area])

    # Miembros (muchos a muchos con admin)
    members = relationship(
        "Integrant",
        secondary="group_integrant",
        back_populates="groups"
    )

# Tabla intermedia con campo extra 'admin'
group_integrant = Table(
    "group_integrant",
    Base.metadata,
    Column(
        "id_group_integrant",
        Integer,
        primary_key=True,
        server_default="nextval('group_integrant_id_group_integrant_seq')"
    ),
    Column("id_group", Integer, ForeignKey("group.id_group"), nullable=False),
    Column("id_integrant", Integer, ForeignKey("integrant.id_integrant"), nullable=False),
    Column("admin", Boolean, default=False, nullable=False)
)