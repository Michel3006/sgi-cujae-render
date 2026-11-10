# softwares/routes.py
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
    prefix="/softwares",
    tags=["softwares"]
)

@router.get("/", response_model=List[schemas.Software])
def read_softwares(
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = Query(None, description="Filter softwares by author ID (integrant ID)"),
    search: Optional[str] = Query(None, description="Search term in any text field (title, assignee, keywords, etc.)"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_softwares(db, skip=skip, limit=limit, author_id=author_id, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{software_id}", response_model=schemas.Software)
def read_software(software_id: int, db: Session = Depends(get_db)):
    db_software = crud.get_software(db, software_id)
    if db_software is None:
        raise HTTPException(status_code=404, detail="Software not found")
    return db_software

@router.post("/", response_model=schemas.Software)
def create_software(software: schemas.SoftwareCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_software(db=db, software=software)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{software_id}", response_model=schemas.Software)
def update_software(software_id: int, software: schemas.SoftwareUpdate, db: Session = Depends(get_db)):
    try:
        db_software = crud.update_software(db, software_id, software)
        if db_software is None:
            raise HTTPException(status_code=404, detail="Software not found")
        return db_software
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{software_id}", response_model=schemas.Software)
def delete_software(software_id: int, db: Session = Depends(get_db)):
    db_software = crud.delete_software(db, software_id)
    if db_software is None:
        raise HTTPException(status_code=404, detail="Software not found")
    return db_software

@router.get("/count/{faculty_id}", response_model=schemas.SoftwareCountByFaculty)
def get_software_count_by_faculty_endpoint(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    """
    Devuelve el conteo total de softwares y los que tienen al menos un autor 
    perteneciente a la facultad especificada.
    """
    try:
        result = crud.get_software_count_by_faculty(db, faculty_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener los conteos de softwares por facultad"
        )