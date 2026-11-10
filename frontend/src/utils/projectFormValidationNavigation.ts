export type ProjectFormTabId =
  | "datos-iniciales"
  | "detalles-cientificos"
  | "tareas"
  | "integrantes"
  | "presupuesto"
  | "criterio-consejo"

type ProjectFormErrorTarget = {
  tabId: ProjectFormTabId
  fieldId: string | null
}

const FIELD_TAB_MAP: Record<string, ProjectFormErrorTarget> = {
  nombre: { tabId: "datos-iniciales", fieldId: "nombre" },
  codigo: { tabId: "datos-iniciales", fieldId: "codigo" },
  palabrasClave: { tabId: "datos-iniciales", fieldId: "palabrasClave" },
  responsable: { tabId: "datos-iniciales", fieldId: "responsable" },
  tematica: { tabId: "datos-iniciales", fieldId: "tematica" },
  tipoProyecto: { tabId: "datos-iniciales", fieldId: "tipoProyecto" },
  estado: { tabId: "datos-iniciales", fieldId: "estado" },
  clasificacion: { tabId: "datos-iniciales", fieldId: "clasificacion" },
  facultad: { tabId: "datos-iniciales", fieldId: "facultad" },
  fechaInicio: { tabId: "datos-iniciales", fieldId: "fechaInicio" },
  fechaFin: { tabId: "datos-iniciales", fieldId: "fechaFin" },
  fechaAprobacion: { tabId: "datos-iniciales", fieldId: "fechaAprobacion" },
  artState: { tabId: "detalles-cientificos", fieldId: "artState" },
  problemaCientifico: { tabId: "detalles-cientificos", fieldId: "problemaCientifico" },
  objetoEstudio: { tabId: "detalles-cientificos", fieldId: "objetoEstudio" },
  campoEstudio: { tabId: "detalles-cientificos", fieldId: "campoEstudio" },
  hipotesis: { tabId: "detalles-cientificos", fieldId: "hipotesis" },
  objetivoPrincipal: { tabId: "detalles-cientificos", fieldId: "objetivoPrincipal" },
  metodosInvestigacion: { tabId: "detalles-cientificos", fieldId: "metodosInvestigacion" },
  terceroInteresado: { tabId: "detalles-cientificos", fieldId: "terceroInteresado" },
  grupoNacional: { tabId: "detalles-cientificos", fieldId: "grupoNacional" },
  grupoInternacional: { tabId: "detalles-cientificos", fieldId: "grupoInternacional" },
  publicarRevista: { tabId: "detalles-cientificos", fieldId: "publicarRevista" },
  participarEventos: { tabId: "detalles-cientificos", fieldId: "participarEventos" },
  codigoCITMA: { tabId: "detalles-cientificos", fieldId: "codigoCITMA" },
  codigoMINVEC: { tabId: "detalles-cientificos", fieldId: "codigoMINVEC" },
  members: { tabId: "integrantes", fieldId: "project-integrantes-section" },
  presupuestoEconomico: { tabId: "presupuesto", fieldId: "presupuestoEconomico" },
  necesidadesEconomicas: { tabId: "presupuesto", fieldId: "necesidadesEconomicas" },
  presupuestoGeneralCUP: { tabId: "presupuesto", fieldId: "presupuestoGeneralCUP" },
  presupuestoAnualCUP: { tabId: "presupuesto", fieldId: "presupuestoAnualCUP" },
  criterioConsejo: { tabId: "criterio-consejo", fieldId: "criterioConsejo" },
}

const PREFIX_TAB_MAP: Array<{
  prefix: string
  tabId: ProjectFormTabId
  fieldId: string
}> = [
  { prefix: "taskName_", tabId: "tareas", fieldId: "project-tasks-section" },
  { prefix: "taskState_", tabId: "tareas", fieldId: "project-tasks-section" },
  { prefix: "taskDates_", tabId: "tareas", fieldId: "project-tasks-section" },
  { prefix: "taskResponsible_", tabId: "tareas", fieldId: "project-tasks-section" },
  { prefix: "externalMemberEmail_", tabId: "integrantes", fieldId: "project-integrantes-section" },
  { prefix: "externalMemberIdentity_", tabId: "integrantes", fieldId: "project-integrantes-section" },
]

export const resolveProjectFormErrorTarget = (errorKey: string): ProjectFormErrorTarget => {
  const directTarget = FIELD_TAB_MAP[errorKey]
  if (directTarget) return directTarget

  const prefixTarget = PREFIX_TAB_MAP.find(({ prefix }) => errorKey.startsWith(prefix))
  if (prefixTarget) {
    return { tabId: prefixTarget.tabId, fieldId: prefixTarget.fieldId }
  }

  return { tabId: "datos-iniciales", fieldId: errorKey }
}

export const getFirstProjectFormErrorEntry = (
  errors: Record<string, string>,
): { key: string; message: string } | null => {
  const [key, message] = Object.entries(errors)[0] ?? []
  if (!key || !message) return null
  return { key, message }
}

export const focusProjectFormField = (fieldId: string | null): void => {
  if (!fieldId) return

  window.setTimeout(() => {
    const element = document.getElementById(fieldId)
    if (!element) return

    element.scrollIntoView({ behavior: "smooth", block: "center" })

    if (element instanceof HTMLElement && typeof element.focus === "function") {
      element.focus({ preventScroll: true })
    }
  }, 150)
}
