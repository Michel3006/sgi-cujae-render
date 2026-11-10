# modules/integrant/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from . import crud, schemas
from core.security import oauth2_scheme, verify_token
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import SessionLocal
from . import crud, schemas

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(
    prefix="/integrants",
    tags=["integrants"]
)

@router.get("/", response_model=list[schemas.IntegrantWithRoles])
def read_integrants(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_integrants(db, skip=skip, limit=limit, search=search)

@router.get("/{integrant_id}", response_model=schemas.IntegrantWithRoles)
def read_integrant(integrant_id: int, db: Session = Depends(get_db)):
    db_integrant = crud.get_integrant(db, integrant_id)
    if db_integrant is None:
        raise HTTPException(status_code=404, detail="Integrant not found")
    return db_integrant

@router.post("/", response_model=schemas.IntegrantGet)
def create_integrant(integrant: schemas.IntegrantCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_integrant(db=db, integrant=integrant)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print("💥 ERROR EN CREATE_INTEGRANT:", str(e))
        print("Tipo de error:", type(e).__name__)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{integrant_id}", response_model=schemas.IntegrantGet)
def update_integrant(integrant_id: int, integrant: schemas.IntegrantUpdate, db: Session = Depends(get_db)):
    try:
        db_integrant = crud.update_integrant(db, integrant_id, integrant)
        if db_integrant is None:
            raise HTTPException(status_code=404, detail="Integrant not found")
        return db_integrant
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{integrant_id}", response_model=schemas.IntegrantGet)
def delete_integrant(integrant_id: int, db: Session = Depends(get_db)):
    db_integrant = crud.delete_integrant(db, integrant_id)
    if db_integrant is None:
        raise HTTPException(status_code=404, detail="Integrant not found")
    return db_integrant
# --- Añade esto al final de modules/integrant/routes.py ---

from fastapi import Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import joinedload
from core.security import verify_token
from modules.integrant.schemas import IntegrantWithRoles
from modules.integrant.models import Integrant

def get_current_integrant(token: str = Depends(oauth2_scheme)):
    from fastapi.security import OAuth2PasswordBearer
    # Definimos oauth2_scheme localmente para evitar import circular
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
    return oauth2_scheme(token)

# Pero mejor: creamos una dependencia manual sin OAuth2PasswordBearer
def get_current_user_from_token(token: str, db: Session):
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    integrant_id = payload.get("sub")
    if integrant_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    integrant = db.query(Integrant)\
        .options(joinedload(Integrant.roles))\
        .filter(Integrant.id == int(integrant_id))\
        .first()
    if integrant is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return integrant

# Nueva dependencia que extrae el token del header
from fastapi import Header

@router.get("/me", response_model=IntegrantWithRoles)
def read_own_integrant(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )
    token = authorization[7:]  # Quita "Bearer "
    current_user = get_current_user_from_token(token, db)
    return current_user