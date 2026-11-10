# integrant_group_evaluation/schemas.py
from pydantic import BaseModel
from typing import Optional


class IntegrantGroupEvaluationBase(BaseModel):
    id_integrant: int
    id_group: int
    description: Optional[str] = None
    id_evaluation: int


class IntegrantGroupEvaluationCreate(IntegrantGroupEvaluationBase):
    pass


class IntegrantGroupEvaluationUpdate(BaseModel):
    id_integrant: Optional[int] = None
    id_group: Optional[int] = None
    description: Optional[str] = None
    id_evaluation: Optional[int] = None


class IntegrantGroupEvaluation(IntegrantGroupEvaluationBase):
    id_integrant_group_evaluation: int

    class Config:
        from_attributes = True
