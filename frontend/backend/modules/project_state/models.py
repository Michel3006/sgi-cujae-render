# project_state/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class ProjectState(Base):
    __tablename__ = "project_state"

    id_project_state = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('project_state_id_project_state_seq')"
    )
    name = Column(String, nullable=True)