"""Dependencias de autorización por rol (JWT Bearer)."""

from fastapi import Depends, HTTPException, status

from modules.auth.crud import get_current_user
from modules.integrant.models import Integrant

ROLE_ADMIN = "ADMIN"
ROLE_USUARIO = "USUARIO"
ROLE_CONSEJO = "CONSEJO"
ROLE_AUTOR = "AUTOR"
ROLE_PUBLICADOR = "PUBLICADOR"


def get_user_roles(user: Integrant) -> set[str]:
    token_roles = getattr(user, "roles_names", None)
    if token_roles:
        return {r for r in token_roles if r}
    return {r.role_name for r in (user.roles or []) if r.role_name}


def _require_roles(*allowed: str):
    allowed_set = set(allowed)

    def checker(current_user: Integrant = Depends(get_current_user)) -> Integrant:
        if not get_user_roles(current_user) & allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta operación",
            )
        return current_user

    return checker


# Cualquier usuario autenticado (lecturas generales)
require_authenticated = get_current_user

# Registros científicos: crear / editar / eliminar
require_scientific_write = _require_roles(ROLE_AUTOR, ROLE_ADMIN)

# Grupos y proyectos: crear / editar / eliminar
require_group_project_write = _require_roles(ROLE_CONSEJO, ROLE_ADMIN)

# Integrantes: crear / editar / eliminar
require_integrant_write = _require_roles(ROLE_ADMIN)

# Estadísticas (endpoints /count/...)
require_stats_view = _require_roles(ROLE_CONSEJO, ROLE_ADMIN)

# Zenodo (todas las operaciones del módulo)
require_zenodo_access = _require_roles(ROLE_ADMIN, ROLE_PUBLICADOR)

# Catálogos y demás escrituras no especificadas
require_admin = _require_roles(ROLE_ADMIN)
