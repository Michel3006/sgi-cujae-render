# auth/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import SessionLocal
from . import schemas, crud
from modules.integrant import crud as integrant_crud
from modules.integrant.schemas import IntegrantGet
from modules.roles import crud as role_crud
from modules.auth.dependencies import require_integrant_write

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/login", response_model=schemas.TokenAndId)
def login_for_access_token(
    form_data: schemas.LoginRequest,
    db: Session = Depends(get_db)
):
    integrant = crud.authenticate_integrant(db, form_data.user_name, form_data.password)
    if not integrant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return crud.build_login_response(integrant)

@router.post("/login-ldap", response_model=schemas.TokenAndId)
def login_with_ldap(
    form_data: schemas.LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login alternativo vía LDAP CUJAE.
    Valida credenciales en el directorio (solo trabajadores). Si el usuario no existe
    en la BD local, se crea automáticamente con rol USUARIO usando datos del LDAP.
    """
    integrant = crud.authenticate_ldap_and_get_integrant(
        db, form_data.user_name, form_data.password
    )
    return crud.build_login_response(integrant)

@router.post("/register", response_model=IntegrantGet, dependencies=[Depends(require_integrant_write)])
def register_new_integrant(
    integrant: schemas.RegisterRequest,
    db: Session = Depends(get_db)
):
    if crud.get_integrant_by_email(db, integrant.email):
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
    if crud.get_integrant_by_username(db, integrant.user_name):
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")

    integrant_data = integrant.model_dump(exclude={"password", "role_ids"})
    extra = {}
    if hasattr(integrant_crud.models.Integrant, "password_hash"):
        extra["password_hash"] = crud.get_password_hash(integrant.password)
    db_integrant = integrant_crud.models.Integrant(**integrant_data, **extra)
    db.add(db_integrant)
    db.flush()  # Para obtener id_integrant

    # Asignar roles si se envían
    if integrant.role_ids:
        for role_id in integrant.role_ids:
            role = role_crud.get_role(db, role_id)
            if not role:
                raise HTTPException(status_code=400, detail=f"El rol con id {role_id} no existe")
            db.execute(
                integrant_crud.models.integrant_role.insert().values(
                    id_integrant=db_integrant.id_integrant,
                    id_role=role_id
                )
            )

    db.commit()
    db.refresh(db_integrant)
    return db_integrant