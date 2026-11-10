# modules/trace/models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from modules.integrant.models import Integrant


class Trace(Base):
    __tablename__ = "trace"

    id_trace = Column(
        Integer,
        primary_key=True,
        index=True,
        server_default="nextval('trace_id_trace_seq')"
    )
    id_integrant = Column(Integer, ForeignKey("integrant.id_integrant"), nullable=True)
    method = Column(String)
    date = Column(DateTime(timezone=True))
    route = Column(String)
    message = Column(String)
    response = Column(Integer)  # Nuevo campo

    # Relación opcional
    integrant = relationship("Integrant", foreign_keys=[id_integrant])