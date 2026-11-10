# modules/trace/crud.py
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from . import models, schemas


def get_trace(db: Session, trace_id: int) -> Optional[models.Trace]:
    return db.query(models.Trace).filter(models.Trace.id_trace == trace_id).first()


def get_traces(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    integrant_id: Optional[int] = None,
    route: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    method: Optional[str] = None,
    date_order: schemas.TraceDateOrder = schemas.TraceDateOrder.desc,
) -> List[models.Trace]:
    query = db.query(models.Trace)

    if integrant_id is not None:
        query = query.filter(models.Trace.id_integrant == integrant_id)
    if route:
        query = query.filter(models.Trace.route.ilike(f"%{route}%"))
    if start_date:
        query = query.filter(models.Trace.date >= start_date)
    if end_date:
        query = query.filter(models.Trace.date <= end_date)
    if method:
        query = query.filter(models.Trace.method == method)

    if date_order == schemas.TraceDateOrder.asc:
        query = query.order_by(models.Trace.date.asc())
    else:
        query = query.order_by(models.Trace.date.desc())

    return query.offset(skip).limit(limit).all()


def create_trace(db: Session, trace: schemas.TraceCreate) -> models.Trace:
    db_trace = models.Trace(**trace.model_dump())
    db.add(db_trace)
    db.commit()
    db.refresh(db_trace)
    return db_trace