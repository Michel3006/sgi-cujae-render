# countries/crud.py
from sqlalchemy.orm import Session
from . import models, schemas

def get_country(db: Session, country_id: int):
    return db.query(models.Country).filter(models.Country.id_country == country_id).first()

def get_countries(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Country).offset(skip).limit(limit).all()

def create_country(db: Session, country: schemas.CountryCreate):
    db_country = models.Country(name=country.name, capital=country.capital, code=country.code)
    db.add(db_country)
    db.commit()
    db.refresh(db_country)
    return db_country

def update_country(db: Session, country_id: int, country_update: schemas.CountryUpdate):
    db_country = get_country(db, country_id)
    if not db_country:
        return None
    for key, value in country_update.model_dump(exclude_unset=True).items():
        setattr(db_country, key, value)
    db.commit()
    db.refresh(db_country)
    return db_country

def delete_country(db: Session, country_id: int):
    db_country = get_country(db, country_id)
    if not db_country:
        return None
    db.delete(db_country)
    db.commit()
    return db_country