# setup_render.py — Script ejecutado al arrancar en Render
# Crea las tablas (si no existen) y el usuario admin con todos los roles.

import sys
import os
import bcrypt

# Asegurar que se pueden importar los módulos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Importar main para disparar Base.metadata.create_all (crea tablas)
import main  # noqa: F401

from database import SessionLocal, engine
from modules.roles import models as role_models
from modules.integrant import models as integrant_models

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# Roles del sistema (mismos nombres que en la tesis)
ROL_NAMES = [
    "Administrador",
    "Consejo Cientifico",
    "Publicador",
    "Autor de registro",
    "Responsable de Proyecto",
    "Responsable de Grupo",
    "Usuario Base",
]

db = SessionLocal()

try:
    # 1. Crear roles si no existen
    role_ids = []
    for nombre in ROL_NAMES:
        existente = db.query(role_models.Role).filter(role_models.Role.role_name == nombre).first()
        if not existente:
            r = role_models.Role(role_name=nombre)
            db.add(r)
            db.flush()
            role_ids.append(r.id_rol)
            print(f"[setup] Rol creado: {nombre} (id={r.id_rol})")
        else:
            role_ids.append(existente.id_rol)
            print(f"[setup] Rol existente: {nombre} (id={existente.id_rol})")
    db.commit()

    # 2. Crear usuario admin si no existe
    existente = db.query(integrant_models.Integrant).filter(integrant_models.Integrant.user_name == ADMIN_USERNAME).first()
    if existente:
        print(f"[setup] Usuario '{ADMIN_USERNAME}' ya existe (id={existente.id_integrant}). Actualizando contraseña y roles.")
        existente.password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        # Reemplazar roles por todos
        db.execute(integrant_models.integrant_role.delete().where(integrant_models.integrant_role.c.id_integrant == existente.id_integrant))
        for rid in role_ids:
            db.execute(integrant_models.integrant_role.insert().values(id_integrant=existente.id_integrant, id_role=rid))
        db.commit()
        integrant_id = existente.id_integrant
    else:
        password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        nuevo = integrant_models.Integrant(
            name="Usuario Administrador",
            identity="",
            external=False,
            email="admin@sgi.cu",
            phone="",
            work_center="",
            curriculum="",
            user_name=ADMIN_USERNAME,
            password_hash=password_hash,
        )
        db.add(nuevo)
        db.flush()
        for rid in role_ids:
            db.execute(integrant_models.integrant_role.insert().values(id_integrant=nuevo.id_integrant, id_role=rid))
        db.commit()
        integrant_id = nuevo.id_integrant
        print(f"[setup] Usuario '{ADMIN_USERNAME}' creado (id={integrant_id}) con contraseña '{ADMIN_PASSWORD}'")

    # 3. Verificar
    from sqlalchemy.orm import joinedload
    usuario = db.query(integrant_models.Integrant).options(joinedload(integrant_models.Integrant.roles)).filter(integrant_models.Integrant.user_name == ADMIN_USERNAME).first()
    print(f"[setup] Verificación: usuario={usuario.user_name}, roles={[r.role_name for r in usuario.roles]}")
    print(f"[setup] Setup completado. Credenciales: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")

except Exception as e:
    print(f"[setup] ERROR durante el setup: {e}")
    db.rollback()
    raise
finally:
    db.close()
