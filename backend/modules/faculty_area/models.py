# faculties_areas/models.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from modules.faculty.models import Faculty # Importamos Faculty para la relación

class FacultyArea(Base):
    __tablename__ = "faculties_areas"

    id_faculty_area = Column(Integer, primary_key=True, index=True, server_default="nextval('faculties_areas_id_faculty_area_seq')")
    name = Column(String, nullable=True)
    id_faculty = Column(Integer, ForeignKey("faculty.id_faculty"), nullable=True)

    # Relación opcional (útil si quieres cargar el nombre de la facultad junto con el área)
    faculty = relationship("Faculty", backref="areas")