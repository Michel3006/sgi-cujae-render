# cientific_degree/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class CientificDegree(Base):
    __tablename__ = "cientific_degree"

    id_cientific_degree = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('cientific_degree_id_cientific_degree_seq')"
    )
    name = Column(String, nullable=False)