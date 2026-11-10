# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings
# Base para los modelos
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
# Configurar el motor de base de datos
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

