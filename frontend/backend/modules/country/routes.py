# countries/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import SessionLocal
from . import crud, schemas

router = APIRouter(
    prefix="/countries",
    tags=["countries"]
)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.Country])
def read_countries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    countries = crud.get_countries(db, skip=skip, limit=limit)
    return countries

@router.get("/{country_id}", response_model=schemas.Country)
def read_country(country_id: int, db: Session = Depends(get_db)):
    db_country = crud.get_country(db, country_id)
    if db_country is None:
        raise HTTPException(status_code=404, detail="Country not found")
    return db_country

@router.post("/", response_model=schemas.Country)
def create_country(country: schemas.CountryCreate, db: Session = Depends(get_db)):
    return crud.create_country(db=db, country=country)

@router.put("/{country_id}", response_model=schemas.Country)
def update_country(country_id: int, country: schemas.CountryUpdate, db: Session = Depends(get_db)):
    db_country = crud.update_country(db, country_id, country)
    if db_country is None:
        raise HTTPException(status_code=404, detail="Country not found")
    return db_country

@router.delete("/{country_id}", response_model=schemas.Country)
def delete_country(country_id: int, db: Session = Depends(get_db)):
    db_country = crud.delete_country(db, country_id)
    if db_country is None:
        raise HTTPException(status_code=404, detail="Country not found")
    return db_country