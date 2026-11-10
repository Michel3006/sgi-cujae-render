from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import SessionLocal
from . import crud, schemas

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(
    prefix="/encounter-types",
    tags=["encounter-types"]
)

@router.get("/", response_model=List[schemas.EncounterType])
def read_encounter_types(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_encounter_types(db, skip=skip, limit=limit)

@router.get("/{type_id}", response_model=schemas.EncounterType)
def read_encounter_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.get_encounter_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Encounter type not found")
    return db_type

@router.post("/", response_model=schemas.EncounterType)
def create_encounter_type(encounter_type: schemas.EncounterTypeCreate, db: Session = Depends(get_db)):
    return crud.create_encounter_type(db=db, encounter_type=encounter_type)

@router.put("/{type_id}", response_model=schemas.EncounterType)
def update_encounter_type(type_id: int, encounter_type: schemas.EncounterTypeUpdate, db: Session = Depends(get_db)):
    db_type = crud.update_encounter_type(db, type_id, encounter_type)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Encounter type not found")
    return db_type

@router.delete("/{type_id}", response_model=schemas.EncounterType)
def delete_encounter_type(type_id: int, db: Session = Depends(get_db)):
    db_type = crud.delete_encounter_type(db, type_id)
    if db_type is None:
        raise HTTPException(status_code=404, detail="Encounter type not found")
    return db_type