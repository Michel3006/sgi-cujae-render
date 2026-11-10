# integrant_group_evaluation/models.py
from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base

# Debe coincidir con la secuencia en PostgreSQL (CREATE SEQUENCE / SERIAL).
INTEGRANT_GROUP_EVALUATION_ID_SEQUENCE = (
    "integrant_group_evaluation_id_integrant_group_evaluation_seq"
)


class IntegrantGroupEvaluation(Base):
    __tablename__ = "integrant_group_evaluation"

    id_integrant_group_evaluation = Column(Integer, primary_key=True)
    id_integrant = Column(Integer, ForeignKey("integrant.id_integrant"), nullable=False)
    id_group = Column(Integer, ForeignKey("group.id_group"), nullable=False)
    description = Column(String, nullable=True)
    id_evaluation = Column(Integer, ForeignKey("evaluation.id_evaluation"), nullable=False)
