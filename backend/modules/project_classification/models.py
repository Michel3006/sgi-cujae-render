# project_classification/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class ProjectClassification(Base):
    __tablename__ = "project_classification"

    id_project_classification = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('project_classification_id_project_classification_seq')"
    )
    name = Column(String, nullable=True)
    code = Column(String, nullable=True)