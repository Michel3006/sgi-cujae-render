from sqlalchemy import Column, Integer, String
from database import Base

class NormType(Base):
    __tablename__ = "norms_types"

    id_norm_type = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('norms_types_id_norm_type_seq')"
    )
    name = Column(String, nullable=True)