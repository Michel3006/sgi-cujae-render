# patents/routes.py
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
    prefix="/patents",
    tags=["patents"],
    dependencies=[Depends(require_authenticated)],
)

@router.get("/", response_model=List[schemas.Patent])
def read_patents(
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = Query(None, description="Filter patents by author ID"),
    search: Optional[str] = Query(None, description="Search term in any text field (title, assignee, keywords, etc.)"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_patents(db, skip=skip, limit=limit, author_id=author_id, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{patent_id}", response_model=schemas.Patent)
def read_patent(patent_id: int, db: Session = Depends(get_db)):
    db_patent = crud.get_patent(db, patent_id)
    if db_patent is None:
        raise HTTPException(status_code=404, detail="Patente no encontrada")
    return db_patent

@router.post("/", response_model=schemas.Patent, dependencies=[Depends(require_scientific_write)])
def create_patent(patent: schemas.PatentCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_patent(db=db, patent=patent)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{patent_id}", response_model=schemas.Patent, dependencies=[Depends(require_scientific_write)])
def update_patent(patent_id: int, patent: schemas.PatentUpdate, db: Session = Depends(get_db)):
    try:
        db_patent = crud.update_patent(db, patent_id, patent)
        if db_patent is None:
            raise HTTPException(status_code=404, detail="Patente no encontrada")
        return db_patent
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{patent_id}", response_model=schemas.Patent, dependencies=[Depends(require_scientific_write)])
def delete_patent(patent_id: int, db: Session = Depends(get_db)):
    db_patent = crud.delete_patent(db, patent_id)
    if db_patent is None:
        raise HTTPException(status_code=404, detail="Patente no encontrada")
    return db_patent

@router.get("/count/{faculty_id}", response_model=schemas.PatentCountByFaculty, dependencies=[Depends(require_stats_view)])
def get_patent_count_by_faculty_endpoint(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    """
    Devuelve el conteo total de patentes y las que tienen al menos un autor 
    perteneciente a la facultad especificada.
    """
    try:
        result = crud.get_patent_count_by_faculty(db, faculty_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener los conteos de patentes por facultad"
        )