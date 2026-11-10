# auth/crud.py
from typing import Optional
import logging
import bcrypt
from sqlalchemy.orm import Session
from jose import JWTError, jwt 
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from database import SessionLocal
from modules.integrant.models import Integrant
from modules.integrant import crud as integrant_crud
from modules.integrant import schemas as integrant_schemas
from modules.roles import crud as role_crud
from . import schemas
from fastapi.security import OAuth2PasswordBearer

logger = logging.getLogger(__name__)
LDAP_DEFAULT_ROLE_NAME = "USUARIO"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
# Configuración de seguridad
SECRET_KEY = "tu_clave_secreta_muy_larga_y_segura"  # ¡Cámbiala en producción!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = None

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def get_integrant_by_username(db: Session, username: str):
    return db.query(Integrant).filter(Integrant.user_name == username).first()

def get_integrant_by_email(db: Session, email: str):
    return db.query(Integrant).filter(Integrant.email == email).first()


def authenticate_integrant(db: Session, username: str, password: str):
    integrant = get_integrant_by_username(db, username)
    if not integrant:
        return None
    password_hash = getattr(integrant, "password_hash", None)
    if password_hash and not verify_password(password, password_hash):
        return None
    return integrant


def build_login_response(integrant) -> schemas.TokenAndId:
    roles = [role.role_name for role in integrant.roles if role.role_name] if integrant.roles else []
    if not roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no tiene roles asignados en el sistema",
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(integrant.id_integrant), "roles": roles},
        expires_delta=access_token_expires,
    )
    return schemas.TokenAndId(
        access_token=access_token,
        token_type="bearer",
        user_id=integrant.id_integrant,
    )


def authenticate_ldap_and_get_integrant(db: Session, username: str, password: str):
    from .ldap_service import authenticate_ldap_user

    ldap_info = authenticate_ldap_user(username, password)
    integrant = get_integrant_by_username(db, ldap_info.sam_account_name)
    if integrant is None:
        integrant = create_integrant_from_ldap(db, ldap_info)
    integrant = integrant_crud.get_integrant(db, integrant.id_integrant)
    return integrant


def create_integrant_from_ldap(db: Session, ldap_info):
    """Crea un integrante local a partir de los datos devueltos por el AD."""
    base_role = role_crud.get_role_by_name(db, LDAP_DEFAULT_ROLE_NAME)
    if base_role is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Rol base '{LDAP_DEFAULT_ROLE_NAME}' no configurado en el sistema",
        )

    display_name = (ldap_info.display_name or "").strip()
    sam = ldap_info.sam_account_name.strip()
    payload = integrant_schemas.IntegrantCreate(
        name=display_name or sam,
        identity=(ldap_info.ci or "").strip() or None,
        external=bool(ldap_info.cujae_person_external),
        email=(ldap_info.mail or "").strip() or None,
        phone=None,
        work_center=None,
        curriculum=None,
        user_name=sam,
        roles_list=[base_role.id_rol],
    )

    try:
        integrant = integrant_crud.create_integrant(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    logger.info(
        "Integrante creado desde LDAP: user_name=%s id=%s rol=%s",
        sam,
        integrant.id_integrant,
        LDAP_DEFAULT_ROLE_NAME,
    )
    print(
        f"[LDAP] Usuario creado en BD: user_name={sam} id={integrant.id_integrant} "
        f"rol={LDAP_DEFAULT_ROLE_NAME}",
        flush=True,
    )
    return integrant


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_integrant(db: Session, token: str):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError as exc:
            # Tokens antiguos emitían sub como int; python-jose exige string.
            if "Subject must be a string" not in str(exc):
                raise
            payload = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=[ALGORITHM],
                options={"verify_sub": False},
            )
        integrant_id = payload.get("sub")
        roles: list = payload.get("roles", [])
        if integrant_id is None:
            raise credentials_exception
        integrant_id = int(integrant_id)
    except (JWTError, TypeError, ValueError):
        raise credentials_exception
    integrant = integrant_crud.get_integrant(db, integrant_id)
    if integrant is None:
        raise credentials_exception
    # Añadimos roles al integrant para uso en endpoints
    integrant.roles_names = roles
    return integrant

# Dependencia reutilizable
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    return get_current_integrant(db, token)

# Esquema OAuth2 para FastAPI
