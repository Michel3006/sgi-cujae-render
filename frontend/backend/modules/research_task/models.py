from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class ResearchTask(Base):
    __tablename__ = "research_task"

    id_research_task = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('research_task_id_research_task_seq')"
    )
    name = Column(String, nullable=True)
    description = Column(String, nullable=True)
    id_responsible = Column(Integer, ForeignKey("integrant.id_integrant"), nullable=True)
    initial_date = Column(Date)
    final_date = Column(Date)
    id_project = Column(Integer, ForeignKey("project.id_project"), nullable=True)
    sort_order = Column(Integer, default=0)
    id_research_task_state = Column(Integer, ForeignKey("research_task_state.id_research_task_state"), nullable=True)
    compliance_report = Column(String, nullable=True)
    remote_task = Column(Boolean, default=False, nullable=False)
    estimation_time = Column(Integer)
    execution_time = Column(Integer)

    # Relaciones
    responsible = relationship("Integrant", foreign_keys=[id_responsible])
    project = relationship("Project", foreign_keys=[id_project])
    state = relationship("ResearchTaskState", foreign_keys=[id_research_task_state])