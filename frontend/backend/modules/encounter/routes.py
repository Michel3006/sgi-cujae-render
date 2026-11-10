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
    prefix="/encounters",
    tags=["encounters"]
)

@router.get("/", response_model=List[schemas.Encounter])
def read_encounters(
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = Query(None, description="Filter encounters by author ID"),
    search: Optional[str] = Query(None, description="Search term in any text field (title, organizer, keywords, etc.)"),
    db: Session = Depends(get_db)
):
    try:
        return crud.get_encounters(db, skip=skip, limit=limit, author_id=author_id, search=search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{encounter_id}", response_model=schemas.Encounter)
def read_encounter(encounter_id: int, db: Session = Depends(get_db)):
    db_enc = crud.get_encounter(db, encounter_id)
    if db_enc is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return db_enc

@router.post("/", response_model=schemas.Encounter)
def create_encounter(encounter: schemas.EncounterCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_encounter(db=db, encounter=encounter)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as h:
        raise h
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{encounter_id}", response_model=schemas.Encounter)
def update_encounter(encounter_id: int, encounter: schemas.EncounterUpdate, db: Session = Depends(get_db)):
    try:
        db_enc = crud.update_encounter(db, encounter_id, encounter)
        if db_enc is None:
            raise HTTPException(status_code=404, detail="Encounter not found")
        return db_enc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{encounter_id}", response_model=schemas.Encounter)
def delete_encounter(encounter_id: int, db: Session = Depends(get_db)):
    db_enc = crud.delete_encounter(db, encounter_id)
    if db_enc is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return db_enc

@router.get("/count/faculty/{faculty_id}", response_model=schemas.EncounterCountByFaculty)
def get_encounter_count_by_faculty_endpoint(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene el total de eventos y la cantidad asociada a una facultad (vía autores).
    """
    try:
        return crud.get_encounter_count_by_faculty(db, faculty_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al contar eventos: {str(e)}")