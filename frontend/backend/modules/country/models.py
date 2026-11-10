# countries/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class Country(Base):
    __tablename__ = "countries"

    id_country = Column(Integer, primary_key=True, index=True, server_default="nextval('countries_id_country_seq')")
    name = Column(String)
    capital = Column(String)
    code = Column(String)