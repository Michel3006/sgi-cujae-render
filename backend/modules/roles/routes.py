# roles/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from modules.auth.dependencies import require_authenticated, require_admin
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
    prefix="/roles",
    tags=["roles"],
    dependencies=[Depends(require_authenticated)],
)

@router.get("/", response_model=List[schemas.Role])
def read_roles(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search in role name"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_roles(db, skip=skip, limit=limit, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{role_id}", response_model=schemas.RoleBase)
def read_role(role_id: int, db: Session = Depends(get_db)):
    db_role = crud.get_role(db, role_id)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return db_role

@router.post("/", response_model=schemas.RoleCreate, dependencies=[Depends(require_admin)])
def create_role(role: schemas.RoleCreate, db: Session = Depends(get_db)):
    # Verificar que no exista un rol con ese id_rol
    if crud.get_role(db, role.id_role):
        raise HTTPException(status_code=400, detail=f"Ya existe un rol con id_rol {role.id_role}")
    try:
        return crud.create_role(db=db, role=role)
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/{role_id}", response_model=schemas.RoleBase, dependencies=[Depends(require_admin)])
def update_role(role_id: int, role: schemas.RoleUpdate, db: Session = Depends(get_db)):
    try:
        db_role = crud.update_role(db, role_id, role)
        if db_role is None:
            raise HTTPException(status_code=404, detail="Rol no encontrado")
        return db_role
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{role_id}", response_model=schemas.RoleBase, dependencies=[Depends(require_admin)])
def delete_role(role_id: int, db: Session = Depends(get_db)):
    db_role = crud.delete_role(db, role_id)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return db_role