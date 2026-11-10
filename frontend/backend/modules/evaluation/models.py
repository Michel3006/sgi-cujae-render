# evaluation/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class Evaluation(Base):
    __tablename__ = "evaluation"

    id_evaluation = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('evaluation_id_evaluation_seq')"
    )
    name = Column(String, nullable=False)