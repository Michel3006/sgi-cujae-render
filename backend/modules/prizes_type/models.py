# prizes_types/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class PrizeType(Base):
    __tablename__ = "prizes_types"

    id_prize_type = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('prizes_types_id_prize_type_seq')"
    )
    name = Column(String, nullable=True)