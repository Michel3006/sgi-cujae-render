import { researchTaskService } from '../services/researchTaskService'
import type { ResearchTask } from '../types/api/researchTask'

export type ProjectTaskFormRow = {
  clientId: string
  id_research_task: number | null
  name: string
  description: string
  id_responsible: number | null
  responsableName: string
  initial_date: string
  final_date: string
  id_research_task_state: number | null
  compliance_report: string
  remote_task: boolean
  estimation_time: string
  execution_time: string
  sort_order: number
}

const parseOptionalInt = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const toNullIfEmpty = (value: string): string | null =>
  value.trim().length > 0 ? value.trim() : null

const buildResearchTaskPayload = (
  row: ProjectTaskFormRow,
  projectId: number,
  sortOrder: number,
) => ({
  name: row.name.trim(),
  description: toNullIfEmpty(row.description),
  id_responsible: row.id_responsible,
  initial_date: row.initial_date || null,
  final_date: row.final_date || null,
  id_project: projectId,
  sort_order: sortOrder,
  id_research_task_state: row.id_research_task_state,
  compliance_report: toNullIfEmpty(row.compliance_report),
  remote_task: row.remote_task,
  estimation_time: parseOptionalInt(row.estimation_time),
  execution_time: parseOptionalInt(row.execution_time),
})

export const enrichProjectTaskRowsWithMembers = (
  tasks: ProjectTaskFormRow[],
  members: Array<{
    integrantId?: number | null
    usuario: { nombre: string; apellidos: string }
  }>,
): ProjectTaskFormRow[] =>
  tasks.map((task) => {
    if (task.responsableName.trim() || task.id_responsible == null) return task

    const member = members.find((entry) => entry.integrantId === task.id_responsible)
    if (!member) return task

    return {
      ...task,
      responsableName: `${member.usuario.nombre} ${member.usuario.apellidos}`.trim(),
    }
  })

export const persistProjectResearchTaskRow = async (
  row: ProjectTaskFormRow,
  projectId: number,
  sortOrder: number,
): Promise<ProjectTaskFormRow> => {
  const payload = buildResearchTaskPayload(row, projectId, sortOrder)

  if (row.id_research_task) {
    const updated = await researchTaskService.updateResearchTask(row.id_research_task, payload)
    return mapResearchTaskToFormRow(updated)
  }

  const created = await researchTaskService.createResearchTask(payload)
  return mapResearchTaskToFormRow(created)
}

export const deletePersistedProjectResearchTask = async (taskId: number): Promise<void> => {
  await researchTaskService.deleteResearchTask(taskId)
}

export const mapResearchTaskToFormRow = (task: ResearchTask): ProjectTaskFormRow => ({
  clientId: `task-${task.id_research_task}`,
  id_research_task: task.id_research_task,
  name: task.name ?? '',
  description: task.description ?? '',
  id_responsible: task.id_responsible,
  responsableName: task.responsible?.name ?? '',
  initial_date: task.initial_date ?? '',
  final_date: task.final_date ?? '',
  id_research_task_state: task.id_research_task_state,
  compliance_report: task.compliance_report ?? '',
  remote_task: task.remote_task ?? false,
  estimation_time: task.estimation_time != null ? String(task.estimation_time) : '',
  execution_time: task.execution_time != null ? String(task.execution_time) : '',
  sort_order: task.sort_order ?? 0,
})

export const createEmptyProjectTaskRow = (): ProjectTaskFormRow => ({
  clientId: `task-new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  id_research_task: null,
  name: '',
  description: '',
  id_responsible: null,
  responsableName: '',
  initial_date: '',
  final_date: '',
  id_research_task_state: null,
  compliance_report: '',
  remote_task: false,
  estimation_time: '',
  execution_time: '',
  sort_order: 0,
})

export const syncProjectResearchTasks = async (
  projectId: number,
  rows: ProjectTaskFormRow[],
  previousTaskIds: number[],
): Promise<{ persistedIds: number[]; updatedRows: ProjectTaskFormRow[] }> => {
  const persistedIds: number[] = []
  const updatedRows: ProjectTaskFormRow[] = []

  const validRows = rows.filter(
    (row) => row.name.trim().length > 0 && row.id_research_task_state != null,
  )

  for (let index = 0; index < validRows.length; index += 1) {
    const row = validRows[index]
    const payload = buildResearchTaskPayload(row, projectId, index)

    if (row.id_research_task) {
      const updated = await researchTaskService.updateResearchTask(row.id_research_task, payload)
      persistedIds.push(updated.id_research_task)
      updatedRows.push(mapResearchTaskToFormRow(updated))
      continue
    }

    const created = await researchTaskService.createResearchTask(payload)
    persistedIds.push(created.id_research_task)
    updatedRows.push(mapResearchTaskToFormRow(created))
  }

  for (const taskId of previousTaskIds) {
    if (!persistedIds.includes(taskId)) {
      await researchTaskService.deleteResearchTask(taskId)
    }
  }

  return { persistedIds, updatedRows }
}
