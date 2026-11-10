from sqlalchemy import Column, Integer, String
from database import Base

class ResearchTaskState(Base):
    __tablename__ = "research_task_state"

    id_research_task_state = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('research_task_state_id_research_task_state_seq')"
    )
    name = Column(String, nullable=True)