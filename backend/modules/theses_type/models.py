# theses_types/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class ThesisType(Base):
    __tablename__ = "theses_types"

    id_thesis_type = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('theses_types_id_thesis_type_seq')"
    )
    name = Column(String, nullable=True)