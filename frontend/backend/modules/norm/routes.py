from fastapi import APIRouter, Depends, HTTPException, Query
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
    prefix="/norms",
    tags=["norms"]
)

@router.get("/", response_model=List[schemas.Norm])
def read_norms(
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = Query(None, description="Filter norms by author ID"),
    search: Optional[str] = Query(None, description="Search term in any text field (title, registration number, keywords, etc.)"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_norms(db, skip=skip, limit=limit, author_id=author_id, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{norm_id}", response_model=schemas.Norm)
def read_norm(norm_id: int, db: Session = Depends(get_db)):
    db_norm = crud.get_norm(db, norm_id)
    if db_norm is None:
        raise HTTPException(status_code=404, detail="Norm not found")
    return db_norm

@router.post("/", response_model=schemas.Norm)
def create_norm(norm: schemas.NormCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_norm(db=db, norm=norm)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{norm_id}", response_model=schemas.Norm)
def update_norm(norm_id: int, norm: schemas.NormUpdate, db: Session = Depends(get_db)):
    try:
        db_norm = crud.update_norm(db, norm_id, norm)
        if db_norm is None:
            raise HTTPException(status_code=404, detail="Norm not found")
        return db_norm
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{norm_id}", response_model=schemas.Norm)
def delete_norm(norm_id: int, db: Session = Depends(get_db)):
    db_norm = crud.delete_norm(db, norm_id)
    if db_norm is None:
        raise HTTPException(status_code=404, detail="Norm not found")
    return db_norm

@router.get("/count/{faculty_id}", response_model=schemas.NormCountByFaculty)
def get_norm_count_by_faculty_endpoint(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    """
    Devuelve el conteo total de normas y las asociadas a una facultad específica.
    """
    try:
        result = crud.get_norm_count_by_faculty(db, faculty_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener los conteos de normas por facultad"
        )