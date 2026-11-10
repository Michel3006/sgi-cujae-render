"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { Card } from "../components/common/Card"
import { Button } from "../components/common/Button"
import { Input } from "../components/common/Input"
import { Modal } from "../components/common/Modal"
import "./ProjectForm.css"
import { mockRecords } from "../services/mockData"
import { useAuthStore } from "../stores/authStore"
import { canChangeEntityResponsable } from "../utils/groupEditPermissions"
import { usePermissions } from "../hooks/usePermissions"
import { useRequirePermission } from "../hooks/useRequirePermission"
import { useEditFormDirty } from "../hooks/useEditFormDirty"
import type { IUser } from "../types/index"
import {
  recordMetadataService,
  type ProjectTypeOption,
  type ProjectStateOption,
  type ProjectClassificationOption,
  type IntegrantOption,
  type FacultyOption,
} from "../services/record/recordMetadataService"
import { projectService, type CreateProjectPayload } from "../services/projectService"
import { researchTaskService } from "../services/researchTaskService"
import { useToast } from "../contexts/ToastContext"
import { integrantService } from "../services/integrantService"
import {
  syncProjectMembersToIntegrants,
  type ProjectFormMember,
} from "../utils/projectMemberSync"
import {
  filterMemberIdsExcludingResponsable,
  isGroupResponsableIntegrant,
} from "../utils/groupMemberUtils"
import {
  deletePersistedProjectResearchTask,
  enrichProjectTaskRowsWithMembers,
  mapResearchTaskToFormRow,
  persistProjectResearchTaskRow,
  syncProjectResearchTasks,
  type ProjectTaskFormRow,
} from "../utils/projectResearchTaskSync"
import type { ResearchTaskState } from "../types/api/researchTask"
import { ResearchTaskFormModal, type ProjectMemberOption } from "../components/project/ResearchTaskFormModal"
import {
  focusProjectFormField,
  getFirstProjectFormErrorEntry,
  resolveProjectFormErrorTarget,
} from "../utils/projectFormValidationNavigation"
import {
  validateRequired,
  validateEmailRequired,
  validateLength,
  validateDateRange,
  validateKeywords,
  validateNameRequired,
  extractErrorMessage,
} from "../utils/validation"
import {
  IdentityDocumentField,
  validateIdentityField,
  type IdentityCountryOption,
} from "../components/common/IdentityDocumentField"

type IntegrantSearchHook = {
  term: string
  setTerm: (value: string) => void
  results: IntegrantOption[]
  isLoading: boolean
  error: string | null
}

const useIntegrantSearch = (): IntegrantSearchHook => {
  const [term, setTerm] = useState("")
  const [results, setResults] = useState<IntegrantOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const searchValue = term.trim()
    if (searchValue.length < 2) {
      setResults([])
      setError(null)
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    const handler = setTimeout(async () => {
      try {
        setIsLoading(true)
        const data = await recordMetadataService.getIntegrants(searchValue)
        if (isMounted) {
          setResults(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }, 400)

    return () => {
      isMounted = false
      clearTimeout(handler)
    }
  }, [term])

  return { term, setTerm, results, isLoading, error }
}

export const ProjectForm = () => {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const { user: currentUser } = useAuthStore()
  const { isAdmin, isAutor, canCreateProjects } = usePermissions()

  const isAutorUser = isAutor()
  const isNewProject = !id

  useRequirePermission(!isNewProject || canCreateProjects(), "/projects")

  console.log("[v0] ProjectForm - id:", id)
  console.log("[v0] ProjectForm - location.pathname:", location.pathname)

  const isViewMode = id && !location.pathname.includes("/edit")
  const isEditMode = id && location.pathname.includes("/edit")

  console.log("[v0] ProjectForm - isViewMode:", isViewMode)
  console.log("[v0] ProjectForm - isEditMode:", isEditMode)

  const [isSaved, setIsSaved] = useState(false)
  const [activeTab, setActiveTab] = useState("datos-iniciales")

  const [projectTypes, setProjectTypes] = useState<ProjectTypeOption[]>([])
  const [projectStates, setProjectStates] = useState<ProjectStateOption[]>([])
  const [projectClassifications, setProjectClassifications] = useState<ProjectClassificationOption[]>([])
  const [faculties, setFaculties] = useState<FacultyOption[]>([])
  const [selectedProjectTypeId, setSelectedProjectTypeId] = useState<number | null>(null)
  const [selectedProjectStateId, setSelectedProjectStateId] = useState<number | null>(null)
  const [selectedProjectClassificationId, setSelectedProjectClassificationId] = useState<number | null>(null)
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null)
  const [isMetadataLoading, setIsMetadataLoading] = useState(true)
  const [metadataError, setMetadataError] = useState<string | null>(null)

  const [selectedResponsable, setSelectedResponsable] = useState<IUser | undefined>(undefined)
  const [selectedResponsableId, setSelectedResponsableId] = useState<number | null>(null)
  const [loadedResponsableId, setLoadedResponsableId] = useState<number | null>(null)
  const [showResponsableModal, setShowResponsableModal] = useState(false)
  const responsableSearch = useIntegrantSearch()
  const [originalInitialDate, setOriginalInitialDate] = useState<string>("")

  const canChangeProjectResponsable = useMemo(
    () =>
      canChangeEntityResponsable(
        currentUser,
        loadedResponsableId ?? selectedResponsableId,
        isAdmin(),
        !isEditMode,
      ),
    [currentUser, loadedResponsableId, selectedResponsableId, isAdmin, isEditMode],
  )

  const responsableIdForPayload = canChangeProjectResponsable
    ? selectedResponsableId
    : loadedResponsableId ?? selectedResponsableId

  const isCurrentUserResponsable = Boolean(
    isEditMode &&
      isAutorUser &&
      selectedResponsableId &&
      currentUser &&
      parseInt(currentUser.id) === selectedResponsableId,
  )

  const canManageProjectTasks = !isViewMode
  const persistedProjectId = id ? parseInt(id, 10) : null

  const [showDirectoryModal, setShowDirectoryModal] = useState(false)
  const [showExternalModal, setShowExternalModal] = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [members, setMembers] = useState<ProjectFormMember[]>([])
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [externalMembers, setExternalMembers] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [recordSearch, setRecordSearch] = useState("")
  const memberSearch = useIntegrantSearch()
  const [externalMember, setExternalMember] = useState({
    nombre: "",
    apellidos: "",
    numeroIdentidad: "",
    entidad: "",
    email: "",
    id_country: null as number | null,
  })
  const [externalMemberEmailError, setExternalMemberEmailError] = useState<string | null>(null)
  const [externalMemberCountryError, setExternalMemberCountryError] = useState<string | null>(null)
  const [externalMemberIdentityError, setExternalMemberIdentityError] = useState<string | null>(null)
  const [countries, setCountries] = useState<IdentityCountryOption[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [projectDetailsLoaded, setProjectDetailsLoaded] = useState(false)
  const [researchTaskStates, setResearchTaskStates] = useState<ResearchTaskState[]>([])
  const [projectTasks, setProjectTasks] = useState<ProjectTaskFormRow[]>([])
  const [loadedTaskIds, setLoadedTaskIds] = useState<number[]>([])
  const [showResearchTaskModal, setShowResearchTaskModal] = useState(false)
  const [editingTaskClientId, setEditingTaskClientId] = useState<string | null>(null)
  const [viewingTaskReadOnly, setViewingTaskReadOnly] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    tematica: "",
    tipoProyecto: "",
    estado: "",
    detallesCientificos: "",
    criterioConsejo: "",
    palabrasClave: "",
    artState: "",
    problemaCientifico: "",
    objetoEstudio: "",
    campoEstudio: "",
    hipotesis: "",
    objetivoPrincipal: "",
    metodosInvestigacion: "",
    terceroInteresado: "",
    grupoNacional: "",
    grupoInternacional: "",
    publicarRevista: "",
    participarEventos: "",
    codigoCITMA: "",
    codigoMINVEC: "",
    fechaInicio: "",
    fechaFin: "",
    fechaAprobacion: "",
    aprobado: false,
    concluido: false,
    presupuestoEconomico: "",
    necesidadesEconomicas: "",
    presupuestoGeneralCUP: "",
    presupuestoAnualCUP: "",
    is_international: false,
    is_national: false,
    is_territorial: false,
    is_cujae: false,
  })

  const formDataRef = useRef(formData)
  const pendingFocusFieldRef = useRef<string | null>(null)
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  useEffect(() => {
    if (!pendingFocusFieldRef.current) return

    const fieldId = pendingFocusFieldRef.current
    pendingFocusFieldRef.current = null
    focusProjectFormField(fieldId)
  }, [activeTab, isSaved])

  useEffect(() => {
    const loadResearchTaskStatesCatalog = async (): Promise<void> => {
      try {
        const taskStatesResponse = await researchTaskService.getResearchTaskStates()
        setResearchTaskStates(taskStatesResponse)
      } catch (error) {
        console.warn("Estados de tareas de investigación no disponibles:", error)
        setResearchTaskStates([])
      }
    }

    const loadMetadata = async () => {
      try {
        setIsMetadataLoading(true)
        setMetadataError(null)
        const [typesResponse, statesResponse, classificationsResponse, countriesResponse, facultiesResponse] =
          await Promise.all([
            recordMetadataService.getProjectTypes(),
            recordMetadataService.getProjectStates(),
            recordMetadataService.getProjectClassifications(),
            recordMetadataService.getCountries(),
            recordMetadataService.getFaculties(),
          ])
        setProjectTypes(typesResponse)
        setProjectStates(statesResponse)
        setProjectClassifications(classificationsResponse)
        setCountries(countriesResponse)
        setFaculties(facultiesResponse)

        await loadResearchTaskStatesCatalog()
      } catch (error) {
        const message = (error as Error).message || "No se pudieron cargar los catálogos"
        setMetadataError(message)
        showToast(message, "error")
      } finally {
        setIsMetadataLoading(false)
      }
    }

    loadMetadata()
  }, [])

  useEffect(() => {
    setProjectDetailsLoaded(false)
  }, [id])

  useEffect(() => {
    const loadProjectData = async () => {
      if (id && (isViewMode || isEditMode)) {
        setProjectDetailsLoaded(false)
        try {
          const project = await projectService.getProjectById(parseInt(id))
          
          setFormData({
            nombre: project.title || "",
            codigo: project.code || "",
            tematica: project.thematic || "",
            tipoProyecto: project.project_type?.name || project.type?.name || "",
            estado: project.project_state?.name || project.state?.name || "",
            detallesCientificos: project.scientific_details || "",
            criterioConsejo: project.conseil_criteria || project.council_criteria || "",
            palabrasClave: project.keywords || "",
            artState: project.art_state || "",
            problemaCientifico: project.cientific_problem || "",
            objetoEstudio: project.study_object || "",
            campoEstudio: project.study_field || "",
            hipotesis: project.hypothesis || "",
            objetivoPrincipal: project.main_objective || "",
            metodosInvestigacion: project.research_methods || "",
            terceroInteresado: project.interested_third_party || "",
            grupoNacional: project.national_group || "",
            grupoInternacional: project.international_group || "",
            publicarRevista: project.publish_magazine || "",
            participarEventos: project.participate_events || "",
            codigoCITMA: project.citma_code || "",
            codigoMINVEC: project.minvec_code || "",
            fechaInicio: project.initial_date || project.start_date || "",
            fechaFin: project.final_date || project.end_date || "",
            fechaAprobacion: project.approved_date || "",
            aprobado: project.approved ?? false,
            concluido: project.concluded ?? false,
            presupuestoEconomico: project.economic_budget || "",
            necesidadesEconomicas: project.economic_needs || "",
            presupuestoGeneralCUP: project.general_budget_cup != null ? String(project.general_budget_cup) : "",
            presupuestoAnualCUP: project.year_budget_cup != null ? String(project.year_budget_cup) : "",
            is_international: project.is_international ?? false,
            is_national: project.is_national ?? false,
            is_territorial: project.is_territorial ?? false,
            is_cujae: project.is_cujae ?? false,
          })
          
          let loadedResearchTasks: ProjectTaskFormRow[] = []

          try {
            const projectResearchTasks = await researchTaskService.getResearchTasksByProjectId(
              parseInt(id),
              { limit: 200 },
            )
            loadedResearchTasks = projectResearchTasks.map(mapResearchTaskToFormRow)
            setLoadedTaskIds(projectResearchTasks.map((task) => task.id_research_task))
          } catch (taskError) {
            console.error("Error cargando tareas del proyecto:", taskError)
            loadedResearchTasks = []
            setLoadedTaskIds([])
            showToast("No se pudieron cargar las tareas del proyecto", "error")
          }
          
          if (project.responsible) {
            setSelectedResponsableId(project.responsible.id_integrant)
            setLoadedResponsableId(project.responsible.id_integrant)
            setSelectedResponsable({
              id: String(project.responsible.id_integrant),
              nombre: project.responsible.name.split(" ")[0] || "",
              apellidos: project.responsible.name.split(" ").slice(1).join(" ") || "",
              correoElectronico: project.responsible.email || "",
              nombreUsuario: "",
              numeroIdentidad: "",
              roles: [],
              esExterno: false,
              esAdministrador: false,
            } as IUser)
          } else if (project.id_responsible) {
            setSelectedResponsableId(project.id_responsible)
            setLoadedResponsableId(project.id_responsible)
          }
          
          setSelectedProjectTypeId(project.id_project_type ?? project.project_type?.id_project_type ?? null)
          setSelectedProjectStateId(project.id_project_state ?? project.project_state?.id_project_state ?? null)
          setSelectedProjectClassificationId(
            project.id_project_classification ?? project.project_classification?.id_project_classification ?? null,
          )
          setSelectedFacultyId(project.id_faculty ?? project.faculty?.id_faculty ?? null)
          
          // Guardar fecha de creación original
          if (project.initial_date) {
            setOriginalInitialDate(project.initial_date)
          }
          
          // Cargar miembros (excluyendo al responsable del proyecto)
          if (project.members) {
            const responsableIntegrantId =
              project.id_responsible ?? project.responsible?.id_integrant ?? null
            const membersWithoutResponsable = project.members.filter(
              (member) => !isGroupResponsableIntegrant(member.id_integrant, responsableIntegrantId),
            )
            const memberIds = membersWithoutResponsable.map((member) => member.id_integrant)
            setSelectedMemberIds(memberIds)

            const integrantCache = new Map<
              number,
              {
                id_integrant: number
                name: string
                email?: string | null
                external?: boolean
                identity?: string | null
                work_center?: string | null
              }
            >()

            const resolveMemberIntegrant = async (
              member: (typeof project.members)[number],
            ): Promise<{
              id_integrant: number
              name: string
              email?: string | null
              external?: boolean
              identity?: string | null
              work_center?: string | null
            } | null> => {
              if (integrantCache.has(member.id_integrant)) {
                return integrantCache.get(member.id_integrant)!
              }

              try {
                const integrant = await integrantService.getIntegrantById(member.id_integrant)
                const summary = {
                  id_integrant: integrant.id_integrant,
                  name: integrant.name,
                  email: integrant.email,
                  external: integrant.external,
                  identity: integrant.identity,
                  work_center: integrant.work_center,
                }
                integrantCache.set(member.id_integrant, summary)
                return summary
              } catch (error) {
                console.error("Error cargando integrante del proyecto:", error)
                return null
              }
            }

            const mappedMembers = await Promise.all(
              membersWithoutResponsable.map(async (m, idx) => {
                const integrantInfo = await resolveMemberIntegrant(m)
                const fullName = integrantInfo?.name?.trim() || ""
                const [firstName, ...rest] = fullName.length > 0 ? fullName.split(" ") : ["Integrante", ""]

                return {
                  id: `member-${m.id_project_member || idx}`,
                  integrantId: m.id_integrant,
                  usuario: {
                    id: String(m.id_integrant),
                    nombre: firstName || "Integrante",
                    apellidos: rest.join(" ").trim(),
                    correoElectronico: integrantInfo?.email || "",
                    nombreUsuario: "",
                    numeroIdentidad: integrantInfo?.identity || "",
                    entidad: integrantInfo?.work_center || "",
                    roles: [],
                    esExterno: integrantInfo?.external ?? false,
                    esAdministrador: false,
                  },
                  rol: (m as { admin?: boolean }).admin ? "responsable_proyecto" : "integrante_proyecto",
                }
              }),
            )
            setMembers(mappedMembers)
            setExternalMembers(mappedMembers.filter((m) => m.usuario.esExterno))
            setProjectTasks(enrichProjectTaskRowsWithMembers(loadedResearchTasks, mappedMembers))
          } else {
            setProjectTasks(loadedResearchTasks)
          }
          
          setIsSaved(true)
          setProjectDetailsLoaded(true)
        } catch (error) {
          console.error("Error cargando proyecto:", error)
          const message = (error as Error).message || "Error al cargar el proyecto"
          setMetadataError(message)
          showToast(message, "error")
          setProjectDetailsLoaded(false)
        }
      }
    }
    
    loadProjectData()
  }, [id, isViewMode, isEditMode])

  const projectEditSnapshot = useMemo(
    () => ({
      formData,
      selectedProjectTypeId,
      selectedProjectStateId,
      selectedProjectClassificationId,
      selectedFacultyId,
      selectedResponsableId: responsableIdForPayload,
      members: members.map((member) => ({
        integrantId: member.integrantId,
        rol: member.rol,
        nombre: member.usuario.nombre,
        apellidos: member.usuario.apellidos,
        correoElectronico: member.usuario.correoElectronico,
        numeroIdentidad: member.usuario.numeroIdentidad,
        entidad: member.usuario.entidad,
        esExterno: member.usuario.esExterno,
      })),
      projectTasks: projectTasks.map((task) => ({
        id_research_task: task.id_research_task,
        name: task.name,
        description: task.description,
        id_responsible: task.id_responsible,
        initial_date: task.initial_date,
        final_date: task.final_date,
        id_research_task_state: task.id_research_task_state,
        compliance_report: task.compliance_report,
        remote_task: task.remote_task,
        estimation_time: task.estimation_time,
        execution_time: task.execution_time,
      })),
    }),
    [
      formData,
      selectedProjectTypeId,
      selectedProjectStateId,
      selectedProjectClassificationId,
      selectedFacultyId,
      members,
      responsableIdForPayload,
      projectTasks,
    ],
  )

  const responsableDisplayName = useMemo(() => {
    if (!selectedResponsable) {
      return selectedResponsableId ? `Integrante #${selectedResponsableId}` : "No asignado"
    }

    const fullName = `${selectedResponsable.nombre} ${selectedResponsable.apellidos}`.trim()
    if (fullName) {
      return selectedResponsable.facultad ? `${fullName} - ${selectedResponsable.facultad}` : fullName
    }
    if (selectedResponsable.correoElectronico) return selectedResponsable.correoElectronico
    return selectedResponsableId ? `Integrante #${selectedResponsableId}` : "No asignado"
  }, [selectedResponsable, selectedResponsableId])

  const renderProjectResponsableField = () => {
    const hasResponsable = Boolean(selectedResponsable || selectedResponsableId)

    if (isEditMode && !canChangeProjectResponsable) {
      return (
        <>
          <div className="selected-responsable selected-responsable--readonly">
            <span className="selected-responsable__name">{responsableDisplayName}</span>
          </div>
          <p className="form-hint" role="status">
            Solo el responsable del proyecto o un administrador pueden cambiar el responsable.
          </p>
        </>
      )
    }

    return (
      <div className="responsable-selector">
        {hasResponsable ? (
          <div className="selected-responsable">
            <span className="selected-responsable__name">{responsableDisplayName}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowResponsableModal(true)}
              aria-label="Cambiar responsable del proyecto"
            >
              Cambiar
            </Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setShowResponsableModal(true)}>
            Seleccionar Responsable
          </Button>
        )}
      </div>
    )
  }

  const isProjectEditDirty = useEditFormDirty(
    Boolean(isEditMode && projectDetailsLoaded),
    projectEditSnapshot,
  )

  const navigateToFirstFieldError = (errors: Record<string, string>) => {
    const firstError = getFirstProjectFormErrorEntry(errors)
    if (!firstError) return

    const target = resolveProjectFormErrorTarget(firstError.key)

    if (!isEditMode && !isViewMode && target.tabId !== "datos-iniciales") {
      setIsSaved(true)
    }

    pendingFocusFieldRef.current = target.fieldId
    setActiveTab(target.tabId)
    showToast(firstError.message, "error")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validar campos básicos
    const errors: Record<string, string> = {}
    const nombreError = validateRequired(formData.nombre, "Título del proyecto")
    if (nombreError) errors.nombre = nombreError

    const tematicaError = validateRequired(formData.tematica, "Temática")
    if (tematicaError) errors.tematica = tematicaError

    const codigoError = validateRequired(formData.codigo, "Código del proyecto")
    if (codigoError) errors.codigo = codigoError

    if (!selectedProjectStateId) {
      errors.estado = "Debe seleccionar un estado del proyecto"
    }

    if (!selectedProjectTypeId) {
      errors.tipoProyecto = "Debe seleccionar un tipo de proyecto"
    }

    if (!selectedResponsable) {
      errors.responsable = "Debe seleccionar un responsable para el proyecto"
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      navigateToFirstFieldError(errors)
      return
    }

    setFieldErrors({})

    if (isEditMode) {
      showToast("Use el botón «Actualizar Proyecto» al final del formulario para guardar los cambios.", "error")
      return
    }

    setIsSaved(true)
    showToast("Datos iniciales guardados. Por favor, complete los demás campos del proyecto.", "success")
    setActiveTab("detalles-cientificos")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => {
        const next = { ...prev, [name]: checked }
        formDataRef.current = next
        return next
      })
      return
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      formDataRef.current = next
      return next
    })
  }

  const projectMemberOptions = useMemo((): ProjectMemberOption[] => {
    return members
      .filter((member) => member.integrantId != null)
      .map((member) => ({
        id_integrant: member.integrantId as number,
        name: `${member.usuario.nombre} ${member.usuario.apellidos}`.trim(),
        email: member.usuario.correoElectronico || null,
      }))
  }, [members])

  const hasProjectMembers = projectMemberOptions.length > 0

  const ensureResearchTaskStatesLoaded = async (): Promise<boolean> => {
    if (researchTaskStates.length > 0) return true

    try {
      const states = await researchTaskService.getResearchTaskStates()
      setResearchTaskStates(states)
      return states.length > 0
    } catch (error) {
      showToast(
        (error as Error).message ||
          "No se pudieron cargar los estados de tareas. Verifique que el backend exponga /research-task-states/",
        "error",
      )
      return false
    }
  }

  const handleOpenCreateTaskModal = async () => {
    if (!hasProjectMembers) {
      showToast("Agregue integrantes al proyecto antes de definir las tareas", "error")
      pendingFocusFieldRef.current = "project-integrantes-section"
      if (!isEditMode && !isViewMode) {
        setIsSaved(true)
      }
      setActiveTab("integrantes")
      return
    }

    const statesReady = await ensureResearchTaskStatesLoaded()
    if (!statesReady) return

    setEditingTaskClientId(null)
    setViewingTaskReadOnly(false)
    setShowResearchTaskModal(true)
  }

  const handleOpenEditTaskModal = async (clientId: string) => {
    if (!hasProjectMembers) {
      showToast("Agregue integrantes al proyecto antes de editar las tareas", "error")
      pendingFocusFieldRef.current = "project-integrantes-section"
      if (!isEditMode && !isViewMode) {
        setIsSaved(true)
      }
      setActiveTab("integrantes")
      return
    }

    const statesReady = await ensureResearchTaskStatesLoaded()
    if (!statesReady) return

    setEditingTaskClientId(clientId)
    setViewingTaskReadOnly(false)
    setShowResearchTaskModal(true)
  }

  const handleOpenViewTaskModal = (clientId: string) => {
    setEditingTaskClientId(clientId)
    setViewingTaskReadOnly(true)
    setShowResearchTaskModal(true)
  }

  const handleCloseResearchTaskModal = () => {
    setShowResearchTaskModal(false)
    setEditingTaskClientId(null)
    setViewingTaskReadOnly(false)
  }

  const handleSaveResearchTask = async (task: ProjectTaskFormRow) => {
    const isEditingExistingTask = Boolean(editingTaskClientId)
    const taskSortOrder = isEditingExistingTask
      ? (projectTasks.find((existingTask) => existingTask.clientId === editingTaskClientId)?.sort_order ??
        projectTasks.length)
      : projectTasks.length

    const nextTask: ProjectTaskFormRow = isEditingExistingTask
      ? {
          ...task,
          clientId: editingTaskClientId as string,
          id_research_task:
            projectTasks.find((existingTask) => existingTask.clientId === editingTaskClientId)
              ?.id_research_task ?? null,
          sort_order: taskSortOrder,
        }
      : { ...task, sort_order: taskSortOrder }

    if (persistedProjectId && !Number.isNaN(persistedProjectId)) {
      try {
        const persistedTask = await persistProjectResearchTaskRow(
          nextTask,
          persistedProjectId,
          taskSortOrder,
        )
        const enrichedTask = {
          ...enrichProjectTaskRowsWithMembers([persistedTask], members)[0],
          clientId: isEditingExistingTask
            ? (editingTaskClientId as string)
            : `task-${persistedTask.id_research_task}`,
        }

        if (isEditingExistingTask) {
          setProjectTasks((prev) =>
            prev.map((existingTask) =>
              existingTask.clientId === editingTaskClientId ? enrichedTask : existingTask,
            ),
          )
        } else {
          setProjectTasks((prev) => [...prev, enrichedTask])
        }

        setLoadedTaskIds((prev) => {
          const nextIds = prev.filter((taskId) => taskId !== enrichedTask.id_research_task)
          if (enrichedTask.id_research_task != null) {
            nextIds.push(enrichedTask.id_research_task)
          }
          return nextIds
        })

        handleCloseResearchTaskModal()
        showToast(
          isEditingExistingTask ? "Tarea actualizada correctamente" : "Tarea creada correctamente",
          "success",
        )
        return
      } catch (error) {
        showToast(
          (error as Error).message || "No se pudo guardar la tarea en el servidor",
          "error",
        )
        return
      }
    }

    const enrichedNextTask = enrichProjectTaskRowsWithMembers([nextTask], members)[0]

    if (isEditingExistingTask) {
      setProjectTasks((prev) =>
        prev.map((existingTask) =>
          existingTask.clientId === editingTaskClientId ? enrichedNextTask : existingTask,
        ),
      )
    } else {
      setProjectTasks((prev) => [...prev, enrichedNextTask])
    }

    handleCloseResearchTaskModal()
    showToast(
      isEditingExistingTask ? "Tarea actualizada en el proyecto" : "Tarea agregada al proyecto",
      "success",
    )
  }

  const handleRemoveProjectTask = async (clientId: string) => {
    const taskToRemove = projectTasks.find((task) => task.clientId === clientId)
    if (!taskToRemove) return

    if (persistedProjectId && taskToRemove.id_research_task != null) {
      try {
        await deletePersistedProjectResearchTask(taskToRemove.id_research_task)
        setLoadedTaskIds((prev) =>
          prev.filter((taskId) => taskId !== taskToRemove.id_research_task),
        )
        setProjectTasks((prev) => prev.filter((task) => task.clientId !== clientId))
        showToast("Tarea eliminada correctamente", "success")
        return
      } catch (error) {
        showToast(
          (error as Error).message || "No se pudo eliminar la tarea del servidor",
          "error",
        )
        return
      }
    }

    setProjectTasks((prev) => prev.filter((task) => task.clientId !== clientId))
    showToast("Tarea eliminada del proyecto", "success")
  }

  const editingTask = editingTaskClientId
    ? projectTasks.find((task) => task.clientId === editingTaskClientId) ?? null
    : null

  const getResearchTaskStateName = (stateId: number | null): string => {
    if (stateId == null) return "—"
    return researchTaskStates.find((state) => state.id_research_task_state === stateId)?.name ?? "—"
  }

  const removeIntegrantFromMembers = (integrantId: number) => {
    setMembers((prev) => prev.filter((member) => member.integrantId !== integrantId))
    setSelectedMemberIds((prev) => prev.filter((id) => id !== integrantId))
  }

  const handleSelectResponsableIntegrant = (integrant: IntegrantOption) => {
    setSelectedResponsableId(integrant.id_integrant)
    setSelectedResponsable({
      id: String(integrant.id_integrant),
      nombre: integrant.name.split(" ")[0] || "",
      apellidos: integrant.name.split(" ").slice(1).join(" ") || "",
      correoElectronico: integrant.email || "",
      nombreUsuario: "",
      numeroIdentidad: "",
      roles: [],
      esExterno: false,
      esAdministrador: false,
    } as IUser)
    removeIntegrantFromMembers(integrant.id_integrant)
    setShowResponsableModal(false)
    responsableSearch.setTerm("")
    showToast("Responsable seleccionado con éxito", "success")
  }

  const handleSelectMemberIntegrant = (integrant: IntegrantOption) => {
    if (isGroupResponsableIntegrant(integrant.id_integrant, selectedResponsableId)) {
      showToast("El responsable del proyecto no puede agregarse como integrante", "error")
      return
    }
    if (selectedMemberIds.includes(integrant.id_integrant)) {
      showToast("Este integrante ya está agregado", "error")
      return
    }
    const newMember = {
      id: `member-${Date.now()}`,
      integrantId: integrant.id_integrant,
      usuario: {
        id: String(integrant.id_integrant),
        nombre: integrant.name.split(" ")[0] || "",
        apellidos: integrant.name.split(" ").slice(1).join(" ") || "",
        correoElectronico: integrant.email || "",
        nombreUsuario: "",
        numeroIdentidad: "",
        roles: [],
        esExterno: false,
        esAdministrador: false,
      },
      rol: "integrante_proyecto",
    }
    setMembers([...members, newMember])
    setSelectedMemberIds([...selectedMemberIds, integrant.id_integrant])
    memberSearch.setTerm("")
    setShowDirectoryModal(false)
    showToast("Integrante agregado con éxito", "success")
  }

  const handleAddExternalMember = (e: React.FormEvent) => {
    e.preventDefault()
    setExternalMemberEmailError(null)
    setExternalMemberCountryError(null)
    setExternalMemberIdentityError(null)

    const emailErr = validateEmailRequired(externalMember.email, "Correo electrónico")
    const entidadErr = validateRequired(externalMember.entidad, "Entidad")
    const nombreErr = validateNameRequired(externalMember.nombre, "Nombre")
    const apellidosErr = validateNameRequired(externalMember.apellidos, "Apellidos")
    const { countryError, identityError } = validateIdentityField(
      externalMember.numeroIdentidad,
      externalMember.id_country,
      countries,
    )

    if (emailErr || entidadErr || nombreErr || apellidosErr || countryError || identityError) {
      if (emailErr) setExternalMemberEmailError(emailErr)
      if (countryError) setExternalMemberCountryError(countryError)
      if (identityError) setExternalMemberIdentityError(identityError)
      return
    }

    const newMember = {
      id: `external-${Date.now()}`,
      integrantId: null,
      usuario: {
        id: `external-${Date.now()}`,
        nombre: externalMember.nombre.trim(),
        apellidos: externalMember.apellidos.trim(),
        numeroIdentidad: externalMember.numeroIdentidad.trim(),
        entidad: externalMember.entidad.trim(),
        correoElectronico: externalMember.email.trim(),
        id_country: externalMember.id_country,
        esExterno: true,
      },
      rol: "integrante_proyecto",
    }
    setMembers([...members, newMember])
    setExternalMembers([...externalMembers, newMember])
    setShowExternalModal(false)
    setExternalMember({
      nombre: "",
      apellidos: "",
      numeroIdentidad: "",
      entidad: "",
      email: "",
      id_country: null,
    })
    setExternalMemberEmailError(null)
    setExternalMemberCountryError(null)
    setExternalMemberIdentityError(null)
    showToast("Integrante externo agregado con éxito", "success")
  }

  const handleRemoveMember = (memberId: string) => {
    const memberToRemove = members.find((m) => m.id === memberId)
    setMembers(members.filter((m) => m.id !== memberId))
    if (editingMemberId === memberId) {
      setEditingMemberId(null)
    }
    if (memberToRemove?.integrantId) {
      setSelectedMemberIds((prev) => prev.filter((id) => id !== memberToRemove.integrantId))
    }
    if (memberToRemove?.usuario?.esExterno) {
      setExternalMembers((prev) => prev.filter((m) => m.id !== memberId))
    }
  }

  const handleMemberFieldChange = (
    memberId: string,
    field: "nombre" | "apellidos" | "numeroIdentidad" | "entidad" | "correoElectronico",
    value: string,
  ) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, usuario: { ...m.usuario, [field]: value } }
          : m,
      ),
    )
    setExternalMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, usuario: { ...m.usuario, [field]: value } }
          : m,
      ),
    )
  }

  const buildProjectPayload = (
    memberIds: number[],
    data: typeof formData = formDataRef.current,
  ): CreateProjectPayload => {
    const now = new Date().toISOString().split("T")[0]
    const initialDate =
      isEditMode && originalInitialDate
        ? originalInitialDate
        : data.fechaInicio
          ? new Date(data.fechaInicio).toISOString().split("T")[0]
          : now
    const finalDate = data.fechaFin ? new Date(data.fechaFin).toISOString().split("T")[0] : null
    const approvedDate = data.fechaAprobacion
      ? new Date(data.fechaAprobacion).toISOString().split("T")[0]
      : null

    return {
      title: data.nombre,
      code: data.codigo || "",
      scientific_details: toNullIfEmpty(data.detallesCientificos),
      keywords: data.palabrasClave || "",
      member_ids: memberIds,
      id_responsible: responsableIdForPayload,
      thematic: data.tematica || "",
      id_project_type: selectedProjectTypeId,
      art_state: data.artState || "",
      cientific_problem: toNullIfEmpty(data.problemaCientifico),
      study_object: toNullIfEmpty(data.objetoEstudio),
      study_field: data.campoEstudio || "",
      hypothesis: data.hipotesis || "",
      main_objective: toNullIfEmpty(data.objetivoPrincipal),
      research_methods: data.metodosInvestigacion || "",
      interested_third_party: toNullIfEmpty(data.terceroInteresado),
      national_group: data.grupoNacional || "",
      international_group: toNullIfEmpty(data.grupoInternacional),
      publish_magazine: toNullIfEmpty(data.publicarRevista),
      participate_events: toNullIfEmpty(data.participarEventos),
      citma_code: toNullIfEmpty(data.codigoCITMA),
      minvec_code: toNullIfEmpty(data.codigoMINVEC),
      approved: data.aprobado,
      conseil_criteria: data.criterioConsejo || "",
      initial_date: initialDate,
      final_date: finalDate,
      update_date: now,
      id_project_state: selectedProjectStateId,
      id_project_classification: selectedProjectClassificationId,
      economic_budget: data.presupuestoEconomico || "",
      economic_needs: toNullIfEmpty(data.necesidadesEconomicas),
      id_faculty: selectedFacultyId,
      concluded: data.concluido,
      approved_date: approvedDate,
      general_budget_cup: toNullIfEmpty(data.presupuestoGeneralCUP),
      year_budget_cup: toNullIfEmpty(data.presupuestoAnualCUP),
      is_international: data.is_international,
      is_national: data.is_national,
      is_territorial: data.is_territorial,
      is_cujae: data.is_cujae,
    }
  }

  const persistProject = async () => {
    const { memberIds, updatedMembers } = await syncProjectMembersToIntegrants(members)
    setMembers(updatedMembers)
    setExternalMembers(updatedMembers.filter((member) => member.usuario.esExterno))

    const filteredMemberIds = filterMemberIdsExcludingResponsable(
      memberIds,
      responsableIdForPayload,
    )
    setSelectedMemberIds(filteredMemberIds)

    const payload = buildProjectPayload(filteredMemberIds)

    let projectId: number
    if (isEditMode && id) {
      const updated = await projectService.updateProjectWithPayload(parseInt(id), payload)
      projectId = updated.id_project
    } else {
      const created = await projectService.createProject(payload)
      projectId = created.id_project
    }

    const { persistedIds, updatedRows } = await syncProjectResearchTasks(
      projectId,
      projectTasks,
      loadedTaskIds,
    )
    setProjectTasks(updatedRows)
    setLoadedTaskIds(persistedIds)
  }

  const handleAssociateRecord = (record: any) => {
    if (!records.find((r) => r.id === record.id)) {
      setRecords([...records, record])
      setShowRecordModal(false)
      showToast("Registro científico asociado con éxito", "success")
    }
  }

  const handleOpenDirectoryModal = () => {
    setShowDirectoryModal(true)
  }

  // Helper para convertir string vacío a null
  const toNullIfEmpty = (value: string | null | undefined): string | null => {
    return value && value.trim() ? value.trim() : null
  }

  // Función para validar el formulario de proyecto
  const validateProjectForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}

    // Validar nombre del proyecto
    const nombreError = validateRequired(formData.nombre, "Título del proyecto")
    if (nombreError) errors.nombre = nombreError

    // Validar longitud del nombre
    if (formData.nombre) {
      const nombreLengthError = validateLength(formData.nombre, 5, 200, "Título del proyecto")
      if (nombreLengthError) errors.nombre = nombreLengthError
    }

    // Validar temática
    const tematicaError = validateRequired(formData.tematica, "Temática")
    if (tematicaError) errors.tematica = tematicaError

    const codigoError = validateRequired(formData.codigo, "Código del proyecto")
    if (codigoError) errors.codigo = codigoError

    if (!selectedProjectStateId) {
      errors.estado = "Debe seleccionar un estado del proyecto"
    }

    if (!selectedProjectTypeId) {
      errors.tipoProyecto = "Debe seleccionar un tipo de proyecto"
    }

    // Validar palabras clave si están presentes
    if (formData.palabrasClave) {
      const keywordsError = validateKeywords(formData.palabrasClave)
      if (keywordsError) errors.palabrasClave = keywordsError
    }

    // Validar responsable
    if (!selectedResponsableId) {
      errors.responsable = "Debe seleccionar un responsable para el proyecto"
    }

    if (
      selectedMemberIds.some((memberId) =>
        isGroupResponsableIntegrant(memberId, responsableIdForPayload),
      )
    ) {
      errors.members = "El responsable del proyecto no puede figurar como integrante"
    }

    const memberIntegrantIds = new Set(
      members
        .map((member) => member.integrantId)
        .filter((integrantId): integrantId is number => integrantId != null),
    )

    projectTasks.forEach((task, index) => {
      if (!task.name.trim()) {
        errors[`taskName_${index}`] = `La tarea ${index + 1} debe tener un nombre`
      }

      if (!task.id_research_task_state) {
        errors[`taskState_${index}`] = `La tarea ${index + 1} debe tener un estado`
      }

      if (task.id_responsible != null && !memberIntegrantIds.has(task.id_responsible)) {
        errors[`taskResponsible_${index}`] =
          `La tarea ${index + 1} debe tener un responsable integrante del proyecto`
      }

      if (task.initial_date && task.final_date) {
        const dateError = validateDateRange(task.initial_date, task.final_date)
        if (dateError) {
          errors[`taskDates_${index}`] = `Tarea ${index + 1}: ${dateError}`
        }
      }
    })

    // Validar fechas
    if (formData.fechaInicio && formData.fechaFin) {
      const dateError = validateDateRange(formData.fechaInicio, formData.fechaFin)
      if (dateError) errors.fechaFin = dateError
    }

    // Validar emails de miembros externos
    externalMembers.forEach((member, index) => {
      const emailError = validateEmailRequired(
        member.usuario?.correoElectronico,
        `Correo electrónico (integrante externo ${index + 1})`,
      )
      if (emailError) {
        errors[`externalMemberEmail_${index}`] = emailError
      }
      const { identityError } = validateIdentityField(
        member.usuario?.numeroIdentidad ?? "",
        member.usuario?.id_country ?? null,
        countries,
      )
      if (identityError) {
        errors[`externalMemberIdentity_${index}`] = identityError
      }
    })

    setFieldErrors(errors)
    return errors
  }

  const handleSaveCompleteProject = async () => {
    const projectValidationErrors = validateProjectForm()
    if (Object.keys(projectValidationErrors).length > 0) {
      navigateToFirstFieldError(projectValidationErrors)
      return
    }

    try {
      setIsSubmitting(true)
      setFieldErrors({})

      await persistProject()
      showToast(
        isEditMode && id ? "Proyecto actualizado con éxito" : "Proyecto completado y guardado con éxito",
        "success",
      )

      setTimeout(() => {
        navigate("/projects")
      }, 1500)
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error) || "Error al guardar el proyecto"
      showToast(errorMessage, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveAllUpdates = async () => {
    if (!id) return

    const projectValidationErrors = validateProjectForm()
    if (Object.keys(projectValidationErrors).length > 0) {
      navigateToFirstFieldError(projectValidationErrors)
      return
    }

    try {
      setIsSubmitting(true)

      await persistProject()

      showToast("Proyecto actualizado con éxito", "success")
      setTimeout(() => {
        navigate("/projects")
      }, 1500)
    } catch (error) {
      console.error("Error actualizando proyecto:", error)
      const errorMessage = (error as Error).message || "Error al actualizar el proyecto"
      showToast(errorMessage, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredRecords = mockRecords.filter(
    (r) =>
      r.titulo.toLowerCase().includes(recordSearch.toLowerCase()) ||
      r.descripcion.toLowerCase().includes(recordSearch.toLowerCase()),
  )

  const tabs = [
    { id: "datos-iniciales", label: "Datos Iniciales" },
    { id: "detalles-cientificos", label: "Detalles Científicos" },
    { id: "integrantes", label: "Integrantes" },
    { id: "tareas", label: "Tareas" },
    { id: "presupuesto", label: "Presupuesto" },
    { id: "criterio-consejo", label: "Criterio del Consejo" },
  ]

  console.log(
    "[v0] ProjectForm - About to render, isSaved:",
    isSaved,
    "isEditMode:",
    isEditMode,
    "isViewMode:",
    isViewMode,
  )

  return (
    <div className="form-page project-form">
      <Modal
        isOpen={showResponsableModal}
        onClose={() => {
          setShowResponsableModal(false)
          responsableSearch.setTerm("")
        }}
        title="Seleccionar Responsable del Proyecto"
      >
        <div className="modal-content">
          <p className="modal-description">Busque y seleccione un integrante del directorio CUJAE como responsable</p>
          <div className="form-group">
            <Input
              placeholder="Buscar por nombre..."
              value={responsableSearch.term}
              onChange={(e) => responsableSearch.setTerm(e.target.value)}
            />
          </div>
          {responsableSearch.isLoading && <p className="loading-state">Buscando...</p>}
          {responsableSearch.error && <p className="error-state">{responsableSearch.error}</p>}
          {!responsableSearch.isLoading && !responsableSearch.error && responsableSearch.results.length === 0 && responsableSearch.term.trim().length >= 2 && (
            <p className="empty-state">No se encontraron integrantes</p>
          )}
          <div className="directory-list">
            {responsableSearch.results.map((integrant) => (
              <div key={integrant.id_integrant} className="directory-item">
                <div className="directory-item-info">
                  <strong>{integrant.name}</strong>
                  {integrant.email && <span>{integrant.email}</span>}
                  {integrant.work_center && <span>{integrant.work_center}</span>}
                </div>
                <Button size="sm" onClick={() => handleSelectResponsableIntegrant(integrant)}>
                  Seleccionar
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDirectoryModal}
        onClose={() => {
          setShowDirectoryModal(false)
          memberSearch.setTerm("")
        }}
        title="Agregar Integrante desde Directorio CUJAE"
      >
        <div className="modal-content">
          <p className="modal-description">Busque y seleccione un integrante del directorio CUJAE</p>
          <div className="form-group">
            <Input
              placeholder="Buscar por nombre..."
              value={memberSearch.term}
              onChange={(e) => memberSearch.setTerm(e.target.value)}
            />
          </div>
          {memberSearch.isLoading && <p className="loading-state">Buscando...</p>}
          {memberSearch.error && <p className="error-state">{memberSearch.error}</p>}
          {!memberSearch.isLoading && !memberSearch.error && memberSearch.results.length === 0 && memberSearch.term.trim().length >= 2 && (
            <p className="empty-state">No se encontraron integrantes</p>
          )}
          <div className="directory-list">
            {memberSearch.results.map((integrant) => {
              const isResponsable = isGroupResponsableIntegrant(
                integrant.id_integrant,
                selectedResponsableId,
              )

              return (
                <div key={integrant.id_integrant} className="directory-item">
                  <div className="directory-item-info">
                    <strong>{integrant.name}</strong>
                    {integrant.email && <span>{integrant.email}</span>}
                    {integrant.work_center && <span>{integrant.work_center}</span>}
                    {isResponsable && (
                      <span className="form-hint">Responsable del proyecto</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSelectMemberIntegrant(integrant)}
                    disabled={isResponsable}
                    title={
                      isResponsable
                        ? "El responsable del proyecto no puede agregarse como integrante"
                        : undefined
                    }
                  >
                    Agregar
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showExternalModal}
        onClose={() => {
          setShowExternalModal(false)
          setExternalMemberEmailError(null)
        }}
        title="Agregar Integrante Externo"
      >
        <form onSubmit={handleAddExternalMember} className="modal-form">
          <div className="form-group">
            <label>Nombre *</label>
            <Input
              value={externalMember.nombre}
              onChange={(e) => setExternalMember({ ...externalMember, nombre: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Apellidos *</label>
            <Input
              value={externalMember.apellidos}
              onChange={(e) => setExternalMember({ ...externalMember, apellidos: e.target.value })}
              required
            />
          </div>
          <IdentityDocumentField
            countries={countries}
            countryId={externalMember.id_country}
            onCountryIdChange={(id_country) =>
              setExternalMember({ ...externalMember, id_country })
            }
            identity={externalMember.numeroIdentidad}
            onIdentityChange={(numeroIdentidad) =>
              setExternalMember({ ...externalMember, numeroIdentidad })
            }
            onClearErrors={() => {
              setExternalMemberCountryError(null)
              setExternalMemberIdentityError(null)
            }}
            countryError={externalMemberCountryError}
            identityError={externalMemberIdentityError}
          />
          <div className="form-group">
            <label>Entidad a la que pertenece *</label>
            <Input
              value={externalMember.entidad}
              onChange={(e) => setExternalMember({ ...externalMember, entidad: e.target.value })}
              placeholder="Ej: Universidad de La Habana"
              required
            />
          </div>
          <div className="form-group">
            <Input
              label="Correo electrónico *"
              type="email"
              value={externalMember.email}
              onChange={(e) => {
                setExternalMemberEmailError(null)
                setExternalMember({ ...externalMember, email: e.target.value })
              }}
              placeholder="ejemplo@email.com"
              error={externalMemberEmailError ?? undefined}
              autoComplete="email"
            />
          </div>
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowExternalModal(false)
                setExternalMemberEmailError(null)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">Agregar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showRecordModal} onClose={() => setShowRecordModal(false)} title="Asociar Registro Científico">
        <div className="modal-content">
          <div className="form-group">
            <Input
              placeholder="Buscar registro por título o descripción..."
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
            />
          </div>
          <div className="record-list">
            {filteredRecords.length === 0 ? (
              <p className="empty-state">No se encontraron registros</p>
            ) : (
              filteredRecords.map((record) => (
                <div key={record.id} className="record-item">
                  <div className="record-item-info">
                    <strong>{record.titulo}</strong>
                    <span>{record.descripcion}</span>
                    <span>
                      Año: {record.año} | Tipo: {record.tipo}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => handleAssociateRecord(record)}>
                    Asociar
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <ResearchTaskFormModal
        isOpen={showResearchTaskModal}
        onClose={handleCloseResearchTaskModal}
        onSave={handleSaveResearchTask}
        initialTask={editingTask}
        researchTaskStates={researchTaskStates}
        projectMembers={projectMemberOptions}
        readOnly={viewingTaskReadOnly}
      />

      <div className="page-toolbar form-page__toolbar">
        <p className="page-toolbar__lead">
          {isViewMode ? "Información del proyecto" : "Complete la información del proyecto"}
        </p>
      </div>

      {(isSaved || isViewMode || isEditMode) && (
        <div className="form-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit}>
          {((!isSaved && !isViewMode && !isEditMode) || activeTab === "datos-iniciales") && (
            <div className="form-section">
              <h3>Datos Iniciales</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="nombre">
                    Título del Proyecto <span className="required">*</span>
                  </label>
                  <Input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Sistema de Reconocimiento Facial"
                    required
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                  {fieldErrors.nombre && <span className="field-error">{fieldErrors.nombre}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="codigo">
                    Código del Proyecto <span className="required">*</span>
                  </label>
                  <Input
                    type="text"
                    id="codigo"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    placeholder="Ej: PROJ-2024-001"
                    required
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                  {fieldErrors.codigo && <span className="field-error">{fieldErrors.codigo}</span>}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="palabrasClave">
                    Palabras Clave
                  </label>
                  <Input
                    type="text"
                    id="palabrasClave"
                    name="palabrasClave"
                    value={formData.palabrasClave}
                    onChange={handleChange}
                    placeholder="Ej: inteligencia artificial, machine learning, deep learning"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                  {fieldErrors.palabrasClave && (
                    <span className="field-error">{fieldErrors.palabrasClave}</span>
                  )}
                </div>

                {/* <div className="form-group full-width">
                  <label htmlFor="responsable">
                    Responsable <span className="required">*</span>
                  </label>
                  <Input
                    type="text"
                    id="responsable"
                    name="responsable"
                    value="Usuario Actual"
                    placeholder="Buscar responsable del proyecto"
                    required
                    disabled={true}
                  />
                  <small className="form-hint">El responsable es el usuario actual</small>
                </div> */}

                <div className="form-group">
                  <label htmlFor="tematica">
                    Temática <span className="required">*</span>
                  </label>
                  <Input
                    type="text"
                    id="tematica"
                    name="tematica"
                    value={formData.tematica}
                    onChange={handleChange}
                    placeholder="Ej: Inteligencia Artificial"
                    required
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                  {fieldErrors.tematica && <span className="field-error">{fieldErrors.tematica}</span>}
                </div>

                {isMetadataLoading && (
                  <div className="form-group full-width">
                    <p>Cargando catálogos...</p>
                  </div>
                )}
                {metadataError && (
                  <div className="form-group full-width">
                    <p className="error-state">Error al cargar catálogos: {metadataError}</p>
                  </div>
                )}
                {!isMetadataLoading && !metadataError && (
                  <>
                    <div className="form-group">
                      <label htmlFor="tipoProyecto">
                        Tipo de Proyecto <span className="required">*</span>
                      </label>
                      {isViewMode ? (
                        <Input
                          type="text"
                          id="tipoProyecto"
                          name="tipoProyecto"
                          value={projectTypes.find((t) => t.id_project_type === selectedProjectTypeId)?.name || formData.tipoProyecto}
                          disabled={true}
                        />
                      ) : (
                        <select
                          id="tipoProyecto"
                          name="tipoProyecto"
                          value={selectedProjectTypeId || ""}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : null
                            setSelectedProjectTypeId(value)
                            setFormData({ ...formData, tipoProyecto: projectTypes.find((t) => t.id_project_type === value)?.name || "" })
                          }}
                          required
                          className="form-select"
                          disabled={isViewMode || isCurrentUserResponsable}
                        >
                          <option value="">Seleccione un tipo</option>
                          {projectTypes.map((type) => (
                            <option key={type.id_project_type} value={type.id_project_type}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {fieldErrors.tipoProyecto && (
                        <span className="field-error">{fieldErrors.tipoProyecto}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="estado">
                        Estado del Proyecto <span className="required">*</span>
                      </label>
                      {isViewMode ? (
                        <Input
                          type="text"
                          id="estado"
                          name="estado"
                          value={projectStates.find((s) => s.id_project_state === selectedProjectStateId)?.name || formData.estado}
                          disabled={true}
                        />
                      ) : (
                        <select
                          id="estado"
                          name="estado"
                          value={selectedProjectStateId || ""}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : null
                            setSelectedProjectStateId(value)
                            setFormData({ ...formData, estado: projectStates.find((s) => s.id_project_state === value)?.name || "" })
                          }}
                          required
                          className="form-select"
                          disabled={isViewMode || isCurrentUserResponsable}
                        >
                          <option value="">Seleccione un estado</option>
                          {projectStates.map((state) => (
                            <option key={state.id_project_state} value={state.id_project_state}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {fieldErrors.estado && <span className="field-error">{fieldErrors.estado}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="clasificacion">
                        Clasificación del Proyecto
                      </label>
                      {isViewMode ? (
                        <Input
                          type="text"
                          id="clasificacion"
                          name="clasificacion"
                          value={projectClassifications.find((c) => c.id_project_classification === selectedProjectClassificationId)?.name || ""}
                          disabled={true}
                        />
                      ) : (
                        <select
                          id="clasificacion"
                          name="clasificacion"
                          value={selectedProjectClassificationId || ""}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : null
                            setSelectedProjectClassificationId(value)
                          }}
                          className="form-select"
                          disabled={isViewMode || isCurrentUserResponsable}
                        >
                          <option value="">Seleccione una clasificación</option>
                          {projectClassifications.map((classification) => (
                            <option key={classification.id_project_classification} value={classification.id_project_classification}>
                              {classification.name || classification.code}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="facultad">Facultad</label>
                      {isViewMode ? (
                        <Input
                          type="text"
                          id="facultad"
                          name="facultad"
                          value={faculties.find((f) => f.id_faculty === selectedFacultyId)?.name || "No especificada"}
                          disabled
                        />
                      ) : (
                        <select
                          id="facultad"
                          name="facultad"
                          value={selectedFacultyId || ""}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : null
                            setSelectedFacultyId(value)
                          }}
                          className="form-select"
                          disabled={isViewMode || isCurrentUserResponsable}
                        >
                          <option value="">Seleccione una facultad</option>
                          {faculties.map((faculty) => (
                            <option key={faculty.id_faculty} value={faculty.id_faculty}>
                              {faculty.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="fechaInicio">Fecha de Inicio</label>
                      <Input
                        type="date"
                        id="fechaInicio"
                        name="fechaInicio"
                        value={formData.fechaInicio}
                        onChange={handleChange}
                        disabled={isViewMode || isCurrentUserResponsable}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="fechaFin">Fecha de Fin</label>
                      <Input
                        type="date"
                        id="fechaFin"
                        name="fechaFin"
                        value={formData.fechaFin}
                        onChange={handleChange}
                        disabled={isViewMode || isCurrentUserResponsable}
                      />
                      {fieldErrors.fechaFin && <span className="field-error">{fieldErrors.fechaFin}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="fechaAprobacion">Fecha de Aprobación</label>
                      <Input
                        type="date"
                        id="fechaAprobacion"
                        name="fechaAprobacion"
                        value={formData.fechaAprobacion}
                        onChange={handleChange}
                        disabled={isViewMode || isCurrentUserResponsable}
                      />
                    </div>

                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="aprobado"
                          checked={formData.aprobado}
                          onChange={handleChange}
                          disabled={isViewMode || isCurrentUserResponsable}
                        />
                        Proyecto aprobado
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="concluido"
                          checked={formData.concluido}
                          onChange={handleChange}
                          disabled={isViewMode || isCurrentUserResponsable}
                        />
                        Proyecto concluido
                      </label>
                    </div>
                  </>
                )}

                <div className="form-group full-width">
                  <label>
                    Responsable del Proyecto <span className="required">*</span>
                  </label>
                  {isViewMode ? (
                    <Input
                      type="text"
                      value={responsableDisplayName}
                      disabled={true}
                    />
                  ) : (
                    renderProjectResponsableField()
                  )}
                  {fieldErrors.responsable && <span className="field-error">{fieldErrors.responsable}</span>}
                </div>

              </div>

              {!isSaved && !isEditMode && !isViewMode && (
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => navigate("/projects")}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar Datos Iniciales</Button>
                </div>
              )}
            </div>
          )}

          {(isSaved || isViewMode || isEditMode) && activeTab === "detalles-cientificos" && (
            <div className="form-section">
              <h3>Detalles Científicos</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="artState">Estado del Arte</label>
                  <Input
                    type="text"
                    id="artState"
                    name="artState"
                    value={formData.artState}
                    onChange={handleChange}
                    placeholder="Estado del arte del proyecto"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="problemaCientifico">Problema Científico</label>
                  <textarea
                    id="problemaCientifico"
                    name="problemaCientifico"
                    value={formData.problemaCientifico}
                    onChange={handleChange}
                    placeholder="Describa el problema científico"
                    rows={4}
                    className="form-textarea"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="objetoEstudio">Objeto de Estudio</label>
                  <textarea
                    id="objetoEstudio"
                    name="objetoEstudio"
                    value={formData.objetoEstudio}
                    onChange={handleChange}
                    placeholder="Describa el objeto de estudio"
                    rows={4}
                    className="form-textarea"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="campoEstudio">Campo de Estudio</label>
                  <Input
                    type="text"
                    id="campoEstudio"
                    name="campoEstudio"
                    value={formData.campoEstudio}
                    onChange={handleChange}
                    placeholder="Campo de estudio"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="hipotesis">Hipótesis</label>
                  <Input
                    type="text"
                    id="hipotesis"
                    name="hipotesis"
                    value={formData.hipotesis}
                    onChange={handleChange}
                    placeholder="Hipótesis del proyecto"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="objetivoPrincipal">Objetivo Principal</label>
                  <textarea
                    id="objetivoPrincipal"
                    name="objetivoPrincipal"
                    value={formData.objetivoPrincipal}
                    onChange={handleChange}
                    placeholder="Objetivo principal del proyecto"
                    rows={4}
                    className="form-textarea"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="metodosInvestigacion">Métodos de Investigación</label>
                  <Input
                    type="text"
                    id="metodosInvestigacion"
                    name="metodosInvestigacion"
                    value={formData.metodosInvestigacion}
                    onChange={handleChange}
                    placeholder="Métodos de investigación utilizados"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="terceroInteresado">Tercero Interesado</label>
                  <Input
                    type="text"
                    id="terceroInteresado"
                    name="terceroInteresado"
                    value={formData.terceroInteresado}
                    onChange={handleChange}
                    placeholder="Tercero interesado en el proyecto"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="grupoNacional">Grupo Nacional</label>
                  <Input
                    type="text"
                    id="grupoNacional"
                    name="grupoNacional"
                    value={formData.grupoNacional}
                    onChange={handleChange}
                    placeholder="Grupo nacional"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="grupoInternacional">Grupo Internacional</label>
                  <Input
                    type="text"
                    id="grupoInternacional"
                    name="grupoInternacional"
                    value={formData.grupoInternacional}
                    onChange={handleChange}
                    placeholder="Grupo internacional"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="publicarRevista">Publicar en Revista</label>
                  <Input
                    type="text"
                    id="publicarRevista"
                    name="publicarRevista"
                    value={formData.publicarRevista}
                    onChange={handleChange}
                    placeholder="Revista donde se publicará"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="participarEventos">Participar en Eventos</label>
                  <Input
                    type="text"
                    id="participarEventos"
                    name="participarEventos"
                    value={formData.participarEventos}
                    onChange={handleChange}
                    placeholder="Eventos donde participará"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="codigoCITMA">Código CITMA</label>
                  <Input
                    type="text"
                    id="codigoCITMA"
                    name="codigoCITMA"
                    value={formData.codigoCITMA}
                    onChange={handleChange}
                    placeholder="Código CITMA"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="codigoMINVEC">Código MINVEC</label>
                  <Input
                    type="text"
                    id="codigoMINVEC"
                    name="codigoMINVEC"
                    value={formData.codigoMINVEC}
                    onChange={handleChange}
                    placeholder="Código MINVEC"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Clasificación del Proyecto</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="is_international"
                        checked={formData.is_international}
                        onChange={handleChange}
                        disabled={!!isViewMode}
                      />
                      <span>Internacional</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="is_national"
                        checked={formData.is_national}
                        onChange={handleChange}
                        disabled={!!isViewMode}
                      />
                      <span>Nacional</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="is_territorial"
                        checked={formData.is_territorial}
                        onChange={handleChange}
                        disabled={!!isViewMode}
                      />
                      <span>Territorial</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="is_cujae"
                        checked={formData.is_cujae}
                        onChange={handleChange}
                        disabled={!!isViewMode}
                      />
                      <span>CUJAE</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(isSaved || isViewMode || isEditMode) && activeTab === "tareas" && (
            <div className="form-section" id="project-tasks-section">
              <h3>Tareas de investigación</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <div className="section-actions">
                    <label>Listado de tareas</label>
                    {!canManageProjectTasks ? null : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleOpenCreateTaskModal}
                        disabled={!hasProjectMembers}
                        title={
                          !hasProjectMembers
                            ? "Agregue integrantes al proyecto antes de crear tareas"
                            : undefined
                        }
                      >
                        Crear tarea
                      </Button>
                    )}
                  </div>
                  {!hasProjectMembers && canManageProjectTasks && (
                    <p className="form-hint">
                      Debe agregar integrantes en la pestaña «Integrantes» antes de definir las tareas.
                    </p>
                  )}
                  {projectTasks.length === 0 ? (
                    <p className="empty-state">No hay tareas asociadas al proyecto</p>
                  ) : (
                    <div className="members-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Estado</th>
                            <th>Responsable</th>
                            <th>Fechas</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectTasks.map((task, index) => (
                            <tr key={task.clientId}>
                              <td>
                                {task.name || "—"}
                                {fieldErrors[`taskName_${index}`] && (
                                  <small className="field-error">{fieldErrors[`taskName_${index}`]}</small>
                                )}
                              </td>
                              <td>
                                {getResearchTaskStateName(task.id_research_task_state)}
                                {fieldErrors[`taskState_${index}`] && (
                                  <small className="field-error">{fieldErrors[`taskState_${index}`]}</small>
                                )}
                              </td>
                              <td>{task.responsableName || "—"}</td>
                              <td>
                                {task.initial_date || task.final_date
                                  ? `${task.initial_date || "—"} / ${task.final_date || "—"}`
                                  : "—"}
                                {fieldErrors[`taskDates_${index}`] && (
                                  <small className="field-error">{fieldErrors[`taskDates_${index}`]}</small>
                                )}
                              </td>
                              <td>
                                <div className="table-actions">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      canManageProjectTasks
                                        ? handleOpenEditTaskModal(task.clientId)
                                        : handleOpenViewTaskModal(task.clientId)
                                    }
                                  >
                                    {canManageProjectTasks ? "Editar" : "Ver"}
                                  </Button>
                                  {canManageProjectTasks && (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleRemoveProjectTask(task.clientId)}
                                    >
                                      Quitar
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(isSaved || isViewMode || isEditMode) && activeTab === "integrantes" && (
            <div className="form-section" id="project-integrantes-section">
              <h3>Integrantes del Proyecto</h3>
              {fieldErrors.members && <p className="field-error">{fieldErrors.members}</p>}
              {!isViewMode && (
                <div className="section-actions">
                  <Button type="button" variant="secondary" onClick={handleOpenDirectoryModal}>
                    Agregar desde Directorio CUJAE
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setExternalMemberEmailError(null)
                      setShowExternalModal(true)
                    }}
                  >
                    Agregar Externo
                  </Button>
                </div>
              )}
              {members.length === 0 ? (
                <p className="empty-state">No hay integrantes agregados aún</p>
              ) : (
                <div className="members-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Apellidos</th>
                        <th>CI</th>
                        <th>Entidad</th>
                        <th>Correo</th>
                        <th>Tipo</th>
                        {!isViewMode && <th>Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => {
                        const isEditing = editingMemberId === member.id
                        const isExternal = member.usuario.esExterno

                        return (
                          <tr key={member.id} className={isEditing ? "member-row-editing" : undefined}>
                            <td>
                              {isEditing && isExternal ? (
                                <Input
                                  value={member.usuario.nombre}
                                  onChange={(e) => handleMemberFieldChange(member.id, "nombre", e.target.value)}
                                  aria-label="Nombre del integrante"
                                />
                              ) : (
                                member.usuario.nombre
                              )}
                            </td>
                            <td>
                              {isEditing && isExternal ? (
                                <Input
                                  value={member.usuario.apellidos}
                                  onChange={(e) => handleMemberFieldChange(member.id, "apellidos", e.target.value)}
                                  aria-label="Apellidos del integrante"
                                />
                              ) : (
                                member.usuario.apellidos
                              )}
                            </td>
                            <td>
                              {isEditing && isExternal ? (
                                <Input
                                  value={member.usuario.numeroIdentidad || ""}
                                  onChange={(e) =>
                                    handleMemberFieldChange(member.id, "numeroIdentidad", e.target.value)
                                  }
                                  aria-label="Carnet de identidad"
                                />
                              ) : (
                                member.usuario.numeroIdentidad || "—"
                              )}
                            </td>
                            <td>
                              {isEditing && isExternal ? (
                                <Input
                                  value={member.usuario.entidad || ""}
                                  onChange={(e) => handleMemberFieldChange(member.id, "entidad", e.target.value)}
                                  aria-label="Entidad"
                                />
                              ) : (
                                member.usuario.entidad || "—"
                              )}
                            </td>
                            <td>
                              {isEditing && isExternal ? (
                                <Input
                                  type="email"
                                  value={member.usuario.correoElectronico}
                                  onChange={(e) =>
                                    handleMemberFieldChange(member.id, "correoElectronico", e.target.value)
                                  }
                                  aria-label="Correo electrónico"
                                />
                              ) : (
                                member.usuario.correoElectronico || "—"
                              )}
                            </td>
                            <td>{isExternal ? "Externo" : "CUJAE"}</td>
                            {!isViewMode && (
                              <td className="member-actions-cell">
                                {isExternal && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      setEditingMemberId(isEditing ? null : member.id)
                                    }
                                  >
                                    {isEditing ? "Listo" : "Editar"}
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  Eliminar
                                </Button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {(isSaved || isViewMode || isEditMode) && activeTab === "presupuesto" && (
            <div className="form-section">
              <h3>Presupuesto del Proyecto</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="presupuestoEconomico">Presupuesto Económico</label>
                  <Input
                    type="text"
                    id="presupuestoEconomico"
                    name="presupuestoEconomico"
                    value={formData.presupuestoEconomico}
                    onChange={handleChange}
                    placeholder="Presupuesto económico del proyecto"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="necesidadesEconomicas">Necesidades Económicas</label>
                  <textarea
                    id="necesidadesEconomicas"
                    name="necesidadesEconomicas"
                    value={formData.necesidadesEconomicas}
                    onChange={handleChange}
                    placeholder="Describa las necesidades económicas"
                    rows={4}
                    className="form-textarea"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="presupuestoGeneralCUP">Presupuesto General (CUP)</label>
                  <Input
                    type="text"
                    id="presupuestoGeneralCUP"
                    name="presupuestoGeneralCUP"
                    value={formData.presupuestoGeneralCUP}
                    onChange={handleChange}
                    placeholder="Presupuesto general en CUP"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="presupuestoAnualCUP">Presupuesto Anual (CUP)</label>
                  <Input
                    type="text"
                    id="presupuestoAnualCUP"
                    name="presupuestoAnualCUP"
                    value={formData.presupuestoAnualCUP}
                    onChange={handleChange}
                    placeholder="Presupuesto anual en CUP"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
              </div>
            </div>
          )}

          {(isSaved || isViewMode || isEditMode) && activeTab === "criterio-consejo" && (
            <div className="form-section">
              <h3>Criterio del Consejo Científico</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="criterioConsejo">Criterio del Consejo</label>
                  <textarea
                    id="criterioConsejo"
                    name="criterioConsejo"
                    value={formData.criterioConsejo}
                    onChange={handleChange}
                    placeholder="Criterio emitido por el consejo científico"
                    rows={6}
                    className="form-textarea"
                    disabled={isViewMode || isCurrentUserResponsable}
                  />
                </div>
              </div>
            </div>
          )}

          {!isViewMode && (isSaved || isEditMode) && (
            <Card>
              <div className="form-actions">
                {isEditMode ? (
                  <>
                    <Button type="button" variant="secondary" onClick={() => navigate("/projects")}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveAllUpdates}
                      disabled={isSubmitting || !isProjectEditDirty}
                      title={!isProjectEditDirty ? "No hay cambios para guardar" : undefined}
                    >
                      {isSubmitting ? "Guardando..." : "Actualizar Proyecto"}
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={handleSaveCompleteProject} disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar Proyecto Completo"}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {isViewMode && (
            <div className="form-actions">
              <Button type="button" onClick={() => navigate("/projects")}>
                Volver a Proyectos
              </Button>
              {isAdmin() && (
                <Button type="button" variant="secondary" onClick={() => navigate(`/projects/${id}/edit`)}>
                  Editar Proyecto
                </Button>
              )}
            </div>
          )}
        </form>
      </Card>

      {!isSaved && !isViewMode && !isEditMode && (
        <div className="form-info">
          <p>
            <strong>Nota:</strong> Después de guardar los datos iniciales, podrá acceder a las pestañas adicionales para
            gestionar detalles científicos, integrantes, criterio del consejo y producción científica.
          </p>
        </div>
      )}
    </div>
  )
}

