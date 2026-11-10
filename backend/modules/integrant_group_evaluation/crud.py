# integrant_group_evaluation/crud.py
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from . import models, schemas


def get_integrant_group_evaluation(db: Session, item_id: int):
    return (
        db.query(models.IntegrantGroupEvaluation)
        .filter(models.IntegrantGroupEvaluation.id_integrant_group_evaluation == item_id)
        .first()
    )


def get_integrant_group_evaluations(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    id_group: Optional[int] = None,
    id_integrant: Optional[int] = None,
    id_evaluation: Optional[int] = None,
):
    query = db.query(models.IntegrantGroupEvaluation)
    if id_group is not None:
        query = query.filter(models.IntegrantGroupEvaluation.id_group == id_group)
    if id_integrant is not None:
        query = query.filter(models.IntegrantGroupEvaluation.id_integrant == id_integrant)
    if id_evaluation is not None:
        query = query.filter(models.IntegrantGroupEvaluation.id_evaluation == id_evaluation)
    return query.offset(skip).limit(limit).all()


def create_integrant_group_evaluation(db: Session, item: schemas.IntegrantGroupEvaluationCreate):
    # La columna en BD no tiene DEFAULT nextval(...), así que pedimos el id a la secuencia aquí.
    seq = models.INTEGRANT_GROUP_EVALUATION_ID_SEQUENCE
    next_id = db.execute(text(f"SELECT nextval('{seq}')")).scalar()
    db_item = models.IntegrantGroupEvaluation(
        id_integrant_group_evaluation=next_id,
        **item.model_dump(),
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_integrant_group_evaluation(
    db: Session, item_id: int, item_update: schemas.IntegrantGroupEvaluationUpdate
):
    db_item = get_integrant_group_evaluation(db, item_id)
    if not db_item:
        return None
    for key, value in item_update.model_dump(exclude_unset=True).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_integrant_group_evaluation(db: Session, item_id: int):
    db_item = get_integrant_group_evaluation(db, item_id)
    if not db_item:
        return None
    db.delete(db_item)
    db.commit()
    return db_item
