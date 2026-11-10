# modules/role/schemas.py
from pydantic import BaseModel

from pydantic import BaseModel, Field

class RoleBase(BaseModel):
    id_role: int = Field(alias="id_rol")
    role_name: str

    class Config:
        from_attributes = True
        populate_by_name = True  # permite acceder como obj.id_role en vez de obj.id_rol

class Role(RoleBase):
    pass

class RoleCreate(RoleBase):
    pass
class RoleUpdate(RoleBase):
    pass