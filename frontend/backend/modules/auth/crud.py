# auth/crud.py
from typing import Optional
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt 
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from database import SessionLocal
from modules.integrant.models import Integrant
from modules.integrant import crud as integrant_crud
from . import schemas
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
# Configuración de seguridad
SECRET_KEY = "tu_clave_secreta_muy_larga_y_segura"  # ¡Cámbiala en producción!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_integrant_by_email(db: Session, email: str):
    return db.query(Integrant).filter(Integrant.email == email).first()

def authenticate_integrant(db: Session, email: str, password: str):
    integrant = get_integrant_by_email(db, email)
    if not integrant :
        return None
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
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        integrant_id: int = payload.get("sub")
        roles: list = payload.get("roles", [])
        if integrant_id is None:
            raise credentials_exception
    except JWTError:
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
