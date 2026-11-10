# general_category/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class GeneralCategory(Base):
    __tablename__ = "general_category"

    id_general_category = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('general_category_id_general_category_seq')"
    )
    name = Column(String, nullable=False)