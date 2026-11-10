# modules/trace/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from database import SessionLocal
from . import crud, schemas


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


router = APIRouter(
    prefix="/traces",
    tags=["traces"]
)


@router.post("/", response_model=schemas.Trace)
def create_trace(trace: schemas.TraceCreate, db: Session = Depends(get_db)):
    return crud.create_trace(db=db, trace=trace)


@router.get("/", response_model=List[schemas.Trace])
def read_traces(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    integrant_id: Optional[int] = Query(None, description="Filtrar por ID de integrante"),
    route: Optional[str] = Query(None, description="Filtrar por ruta (búsqueda parcial)"),
    start_date: Optional[datetime] = Query(None, description="Fecha de inicio (ISO 8601)"),
    end_date: Optional[datetime] = Query(None, description="Fecha de fin (ISO 8601)"),
    method: Optional[str] = Query(None, description="Filtrar por método exacto (GET, POST, etc.)"),
    date_order: schemas.TraceDateOrder = Query(
        schemas.TraceDateOrder.desc,
        description="Orden por fecha: asc = cronológico (antiguo primero), desc = más reciente primero",
    ),
    db: Session = Depends(get_db),
):
    return crud.get_traces(
        db=db,
        skip=skip,
        limit=limit,
        integrant_id=integrant_id,
        route=route,
        start_date=start_date,
        end_date=end_date,
        method=method,
        date_order=date_order,
    )


@router.get("/{trace_id}", response_model=schemas.Trace)
def read_trace(trace_id: int, db: Session = Depends(get_db)):
    db_trace = crud.get_trace(db, trace_id)
    if db_trace is None:
        raise HTTPException(status_code=404, detail="Trace not found")
    return db_trace