/** Evaluación de un integrante dentro de un grupo (integrant_group_evaluation) */
export interface IntegrantGroupEvaluation {
  id_integrant_group_evaluation: number
  id_integrant: number
  id_group: number
  id_evaluation: number
  description?: string | null
}

export interface IntegrantGroupEvaluationCreate {
  id_integrant: number
  id_group: number
  id_evaluation: number
  description?: string | null
}

/** Payload para PUT (campos opcionales según backend). */
export interface IntegrantGroupEvaluationUpdate {
  id_integrant?: number
  id_group?: number
  id_evaluation?: number
  description?: string | null
}
