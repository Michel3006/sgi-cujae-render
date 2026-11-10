# evaluation/schemas.py
from pydantic import BaseModel
from typing import Optional

class EvaluationBase(BaseModel):
    name: str

class EvaluationCreate(EvaluationBase):
    pass

class EvaluationUpdate(BaseModel):
    name: Optional[str] = None

class Evaluation(EvaluationBase):
    id_evaluation: int

    class Config:
        from_attributes = True