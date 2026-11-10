# auth/routes.py
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import SessionLocal
from . import schemas, crud
from modules.integrant import crud as integrant_crud
from modules.integrant.schemas import IntegrantGet
from modules.roles import crud as role_crud

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
    integrant = crud.authenticate_integrant(db, form_data.email, form_data.password)
    if not integrant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Obtener nombres de roles
    roles = [role.role_name for role in integrant.roles if role.role_name] if integrant.roles else []
    access_token_expires = timedelta(minutes=crud.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = crud.create_access_token(
        data={"sub": integrant.id_integrant, "roles": roles},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user_id":integrant.id_integrant}

@router.post("/register", response_model=IntegrantGet)
def register_new_integrant(
    integrant: schemas.RegisterRequest,
    db: Session = Depends(get_db)
):
    # Verificar que el email no exista
    if crud.get_integrant_by_email(db, integrant.email):
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Validar FKs (igual que en integrant/crud.py)
    from integrant.crud import validate_foreign_keys
    try:
        validate_foreign_keys(db, integrant)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Crear integrant sin contraseña
    integrant_data = integrant.model_dump(exclude={"password", "role_ids"})
    db_integrant = integrant_crud.models.Integrant(
        **integrant_data,
        password_hash=crud.get_password_hash(integrant.password)
    )
    db.add(db_integrant)
    db.flush()  # Para obtener id_integrant

    # Asignar roles si se envían
    if integrant.role_ids:
        for role_id in integrant.role_ids:
            role = role_crud.get_role(db, role_id)
            if not role:
                raise HTTPException(status_code=400, detail=f"Role with id {role_id} does not exist")
            db.execute(
                integrant_crud.models.integrant_role.insert().values(
                    id_integrant=db_integrant.id_integrant,
                    id_role=role_id
                )
            )

    db.commit()
    db.refresh(db_integrant)
    return db_integrant