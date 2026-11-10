# monographs/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from modules.auth.dependencies import require_authenticated, require_scientific_write, require_stats_view
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
    prefix="/monographs",
    tags=["monographs"],
    dependencies=[Depends(require_authenticated)],
)

@router.get("/", response_model=List[schemas.Monograph])
def read_monographs(
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = Query(None, description="Filter monographs by author ID"),
    search: Optional[str] = Query(None, description="Search term in any text field (title, isbn, keywords, etc.)"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_monographs(db, skip=skip, limit=limit, author_id=author_id, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{monograph_id}", response_model=schemas.Monograph)
def read_monograph(monograph_id: int, db: Session = Depends(get_db)):
    db_monograph = crud.get_monograph(db, monograph_id)
    if db_monograph is None:
        raise HTTPException(status_code=404, detail="Monografía no encontrada")
    return db_monograph

@router.post("/", response_model=schemas.Monograph, dependencies=[Depends(require_scientific_write)])
def create_monograph(monograph: schemas.MonographCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_monograph(db=db, monograph=monograph)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/{monograph_id}", response_model=schemas.Monograph, dependencies=[Depends(require_scientific_write)])
def update_monograph(monograph_id: int, monograph: schemas.MonographUpdate, db: Session = Depends(get_db)):
    try:
        db_monograph = crud.update_monograph(db, monograph_id, monograph)
        if db_monograph is None:
            raise HTTPException(status_code=404, detail="Monografía no encontrada")
        return db_monograph
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{monograph_id}", response_model=schemas.Monograph, dependencies=[Depends(require_scientific_write)])
def delete_monograph(monograph_id: int, db: Session = Depends(get_db)):
    db_monograph = crud.delete_monograph(db, monograph_id)
    if db_monograph is None:
        raise HTTPException(status_code=404, detail="Monografía no encontrada")
    return db_monograph

@router.get("/count/{faculty_id}", response_model=schemas.MonographCountByFaculty, dependencies=[Depends(require_stats_view)])
def get_monograph_count_by_faculty_endpoint(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    """
    Devuelve el conteo total de monografías y las que tienen al menos un autor 
    perteneciente a la facultad especificada.
    """
    try:
        result = crud.get_monograph_count_by_faculty(db, faculty_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener los conteos de monografías por facultad"
        )