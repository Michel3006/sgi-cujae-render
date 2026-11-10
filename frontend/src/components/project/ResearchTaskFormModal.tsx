"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Modal } from "../common/Modal"
import { Button } from "../common/Button"
import { Input } from "../common/Input"
import type { ResearchTaskState } from "../../types/api/researchTask"
import {
  createEmptyProjectTaskRow,
  type ProjectTaskFormRow,
} from "../../utils/projectResearchTaskSync"
import { validateDateRange, validateRequired } from "../../utils/validation"

export type ProjectMemberOption = {
  id_integrant: number
  name: string
  email?: string | null
}

export interface ResearchTaskFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (task: ProjectTaskFormRow) => void
  initialTask?: ProjectTaskFormRow | null
  researchTaskStates: ResearchTaskState[]
  projectMembers: ProjectMemberOption[]
  readOnly?: boolean
}

export const ResearchTaskFormModal: React.FC<ResearchTaskFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  researchTaskStates,
  projectMembers,
  readOnly = false,
}) => {
  const [taskData, setTaskData] = useState<ProjectTaskFormRow>(createEmptyProjectTaskRow())
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [memberSearchTerm, setMemberSearchTerm] = useState("")

  useEffect(() => {
    if (!isOpen) return
    setTaskData(initialTask ? { ...initialTask } : createEmptyProjectTaskRow())
    setFieldErrors({})
    setMemberSearchTerm("")
  }, [isOpen, initialTask])

  const filteredProjectMembers = useMemo(() => {
    const term = memberSearchTerm.trim().toLowerCase()
    if (!term) return projectMembers

    return projectMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(term) ||
        (member.email?.toLowerCase().includes(term) ?? false),
    )
  }, [memberSearchTerm, projectMembers])

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setTaskData((prev) => ({ ...prev, [name]: checked }))
      return
    }

    setTaskData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectResponsible = (member: ProjectMemberOption) => {
    setTaskData((prev) => ({
      ...prev,
      id_responsible: member.id_integrant,
      responsableName: member.name,
    }))
    setMemberSearchTerm("")
  }

  const handleClearResponsible = () => {
    setTaskData((prev) => ({
      ...prev,
      id_responsible: null,
      responsableName: "",
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return

    const errors: Record<string, string> = {}
    const nameError = validateRequired(taskData.name, "Nombre de la tarea")
    if (nameError) errors.name = nameError

    if (!taskData.id_research_task_state) {
      errors.id_research_task_state = "Debe seleccionar un estado de la tarea"
    }

    if (taskData.id_responsible != null) {
      const isProjectMember = projectMembers.some(
        (member) => member.id_integrant === taskData.id_responsible,
      )
      if (!isProjectMember) {
        errors.id_responsible = "El responsable debe ser un integrante del proyecto"
      }
    }

    if (taskData.initial_date && taskData.final_date) {
      const dateError = validateDateRange(taskData.initial_date, taskData.final_date)
      if (dateError) errors.final_date = dateError
    }

    if (taskData.estimation_time.trim()) {
      const estimation = Number.parseInt(taskData.estimation_time, 10)
      if (Number.isNaN(estimation) || estimation < 0) {
        errors.estimation_time = "El tiempo estimado debe ser un número entero positivo"
      }
    }

    if (taskData.execution_time.trim()) {
      const execution = Number.parseInt(taskData.execution_time, 10)
      if (Number.isNaN(execution) || execution < 0) {
        errors.execution_time = "El tiempo de ejecución debe ser un número entero positivo"
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    onSave(taskData)
  }

  const modalTitle = readOnly
    ? "Detalle de tarea de investigación"
    : initialTask?.id_research_task
      ? "Editar tarea de investigación"
      : "Crear tarea de investigación"

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="task-name">Nombre *</label>
            <Input
              id="task-name"
              name="name"
              value={taskData.name}
              onChange={handleFieldChange}
              placeholder="Nombre de la tarea"
              disabled={readOnly}
              aria-label="Nombre de la tarea"
            />
            {fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}
          </div>

          <div className="form-group full-width">
            <label htmlFor="task-description">Descripción</label>
            <textarea
              id="task-description"
              name="description"
              value={taskData.description}
              onChange={handleFieldChange}
              placeholder="Descripción de la tarea"
              rows={3}
              className="form-textarea"
              disabled={readOnly}
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="task-state">Estado *</label>
            <select
              id="task-state"
              name="id_research_task_state"
              className="form-select"
              value={taskData.id_research_task_state ?? ""}
              onChange={(e) =>
                setTaskData((prev) => ({
                  ...prev,
                  id_research_task_state: e.target.value
                    ? Number.parseInt(e.target.value, 10)
                    : null,
                }))
              }
              disabled={readOnly}
              aria-label="Estado de la tarea"
            >
              <option value="">Seleccione un estado</option>
              {researchTaskStates.map((state) => (
                <option key={state.id_research_task_state} value={state.id_research_task_state}>
                  {state.name || `Estado #${state.id_research_task_state}`}
                </option>
              ))}
            </select>
            {fieldErrors.id_research_task_state && (
              <small className="field-error">{fieldErrors.id_research_task_state}</small>
            )}
          </div>

          <div className="form-group full-width">
            <label htmlFor="task-responsible-search">Responsable de la tarea</label>
            {taskData.responsableName ? (
              <div className="selected-responsable">
                <span>{taskData.responsableName}</span>
                {!readOnly && (
                  <Button type="button" variant="secondary" size="sm" onClick={handleClearResponsible}>
                    Quitar
                  </Button>
                )}
              </div>
            ) : readOnly ? (
              <p className="empty-state">Sin responsable asignado</p>
            ) : projectMembers.length === 0 ? (
              <p className="empty-state">
                Agregue integrantes al proyecto antes de asignar un responsable a la tarea.
              </p>
            ) : (
              <>
                <Input
                  id="task-responsible-search"
                  placeholder="Buscar entre integrantes del proyecto..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  aria-label="Buscar responsable entre integrantes del proyecto"
                />
                <small className="form-hint">
                  Solo puede seleccionar integrantes ya agregados al proyecto.
                </small>
                {filteredProjectMembers.length === 0 ? (
                  <p className="empty-state">No hay integrantes que coincidan con la búsqueda</p>
                ) : (
                  <div className="directory-list">
                    {filteredProjectMembers.map((member) => (
                      <div key={member.id_integrant} className="directory-item">
                        <div className="directory-item-info">
                          <strong>{member.name}</strong>
                          {member.email && <span>{member.email}</span>}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSelectResponsible(member)}
                        >
                          Seleccionar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {fieldErrors.id_responsible && (
              <small className="field-error">{fieldErrors.id_responsible}</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="task-initial-date">Fecha de inicio</label>
            <Input
              id="task-initial-date"
              name="initial_date"
              type="date"
              value={taskData.initial_date}
              onChange={handleFieldChange}
              disabled={readOnly}
              aria-label="Fecha de inicio de la tarea"
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-final-date">Fecha de fin</label>
            <Input
              id="task-final-date"
              name="final_date"
              type="date"
              value={taskData.final_date}
              onChange={handleFieldChange}
              disabled={readOnly}
              aria-label="Fecha de fin de la tarea"
            />
            {fieldErrors.final_date && <small className="field-error">{fieldErrors.final_date}</small>}
          </div>

          <div className="form-group">
            <label htmlFor="task-estimation-time">Tiempo estimado (horas)</label>
            <Input
              id="task-estimation-time"
              name="estimation_time"
              type="number"
              min={0}
              value={taskData.estimation_time}
              onChange={handleFieldChange}
              disabled={readOnly}
              aria-label="Tiempo estimado en horas"
            />
            {fieldErrors.estimation_time && (
              <small className="field-error">{fieldErrors.estimation_time}</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="task-execution-time">Tiempo de ejecución (horas)</label>
            <Input
              id="task-execution-time"
              name="execution_time"
              type="number"
              min={0}
              value={taskData.execution_time}
              onChange={handleFieldChange}
              disabled={readOnly}
              aria-label="Tiempo de ejecución en horas"
            />
            {fieldErrors.execution_time && (
              <small className="field-error">{fieldErrors.execution_time}</small>
            )}
          </div>

          <div className="form-group full-width">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="remote_task"
                checked={taskData.remote_task}
                onChange={handleFieldChange}
                disabled={readOnly}
              />
              Tarea remota
            </label>
          </div>

          <div className="form-group full-width">
            <label htmlFor="task-compliance-report">Informe de cumplimiento</label>
            <textarea
              id="task-compliance-report"
              name="compliance_report"
              value={taskData.compliance_report}
              onChange={handleFieldChange}
              placeholder="Informe de cumplimiento de la tarea"
              rows={3}
              className="form-textarea"
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            {readOnly ? "Cerrar" : "Cancelar"}
          </Button>
          {!readOnly && (
            <Button type="submit">
              {initialTask?.id_research_task ? "Guardar cambios" : "Agregar tarea"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
