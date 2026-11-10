# project_type/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class ProjectType(Base):
    __tablename__ = "project_type"

    id_project_type = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('project_type_id_project_type_seq')"
    )
    name = Column(String(50), nullable=False)