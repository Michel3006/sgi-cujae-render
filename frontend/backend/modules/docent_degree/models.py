# docent_degree/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class DocentDegree(Base):
    __tablename__ = "docent_degree"

    id_docent_degree = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('docent_degree_id_docent_degree_seq')"
    )
    name = Column(String, nullable=False)