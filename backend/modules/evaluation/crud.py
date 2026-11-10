# evaluation/crud.py
from sqlalchemy.orm import Session
from . import models, schemas

def get_evaluation(db: Session, evaluation_id: int):
    return db.query(models.Evaluation).filter(models.Evaluation.id_evaluation == evaluation_id).first()

def get_evaluations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Evaluation).offset(skip).limit(limit).all()

def create_evaluation(db: Session, evaluation: schemas.EvaluationCreate):
    db_evaluation = models.Evaluation(name=evaluation.name)
    db.add(db_evaluation)
    db.commit()
    db.refresh(db_evaluation)
    return db_evaluation

def update_evaluation(db: Session, evaluation_id: int, evaluation_update: schemas.EvaluationUpdate):
    db_evaluation = get_evaluation(db, evaluation_id)
    if not db_evaluation:
        return None
    update_data = evaluation_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_evaluation, key, value)
    db.commit()
    db.refresh(db_evaluation)
    return db_evaluation

def delete_evaluation(db: Session, evaluation_id: int):
    db_evaluation = get_evaluation(db, evaluation_id)
    if not db_evaluation:
        return None
    db.delete(db_evaluation)
    db.commit()
    return db_evaluation