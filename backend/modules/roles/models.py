# modules/role/models.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database import Base
from modules.integrant.models import integrant_role  # ¡Importa la tabla intermedia!

class Role(Base):
    __tablename__ = 'roles'

    id_rol = Column(Integer, primary_key=True, index=True)
    role_name = Column(String, unique=True, index=True)

    # Relación inversa
    integrants = relationship(
        "Integrant",
        secondary=integrant_role,
        back_populates="roles"
    )