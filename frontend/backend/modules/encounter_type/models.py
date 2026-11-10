from sqlalchemy import Column, Integer, String
from database import Base

class EncounterType(Base):
    __tablename__ = "encounters_types"

    id_encounter_type = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('encounters_types_id_encounter_type_seq')"
    )
    name = Column(String, nullable=True)