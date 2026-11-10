"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "../components/common/Card"
import { Button } from "../components/common/Button"
import { Input } from "../components/common/Input"
import { Table } from "../components/common/Table"
import { OptionsMenu } from "../components/common/OptionsMenu"
import { ConfirmDialog } from "../components/common/ConfirmDialog"
import { Plus, Search, Loader2 } from 'lucide-react'
import { useToast } from "../contexts/ToastContext"
import { projectService } from "../services/projectService"
import { integrantService } from "../services/integrantService"
import { usePermissions } from "../hooks/usePermissions"
import type { IProject, IUser } from "../types"
import type { Project, ProjectState } from "../types/api/project"
import type { IntegrantWithRoles } from "../types/api/integrant"

// Función para mapear IntegrantWithRoles a IUser
const mapIntegrantToIUser = (integrant: IntegrantWithRoles): IUser => {
  const nameParts = integrant.name.split(' ')
  const nombre = nameParts[0] || ''
  const apellidos = nameParts.slice(1).join(' ') || ''

  return {
    id: integrant.id_integrant.toString(),
    nombre,
    apellidos,
    numeroIdentidad: integrant.identity || '',
    correoElectronico: integrant.email || '',
    nombreUsuario: integrant.email?.split('@')[0] || '',
    roles: integrant.roles?.map(r => {
      const roleName = r.role_name.toUpperCase()
      if (roleName === 'ADMIN' || r.id_role === 1) return 'admin'
      if (roleName === 'INTEGRANT' || r.id_role === 2) return 'integrant'
      if (roleName === 'CONSEJO' || r.id_role === 3) return 'consejo'
      return 'usuario'
    }) || [],
    esExterno: integrant.external,
    esAdministrador: integrant.roles?.some(r => r.id_role === 1) || false,
  }
}

const resolveProjectStateName = (
  project: Project,
  statesById: Map<number, ProjectState>,
): string => {
  if (project.project_state?.name) {
    return project.project_state.name
  }

  if (project.state?.name) {
    return project.state.name
  }

  const stateId = project.id_project_state ?? project.id_state
  if (stateId != null) {
    return statesById.get(stateId)?.name ?? "Sin estado"
  }

  return "Sin estado"
}

// Función para mapear Project (API) a IProject (Frontend)
const mapProjectToIProject = (
  project: Project,
  statesById: Map<number, ProjectState>,
): IProject => {
  // Mapear responsable
  let responsable: IUser = {
    id: '',
    nombre: '',
    apellidos: '',
    numeroIdentidad: '',
    correoElectronico: '',
    nombreUsuario: '',
    roles: [],
    esExterno: false,
    esAdministrador: false,
  }
  
  if (project.responsible) {
    const nameParts = project.responsible.name.split(' ')
    responsable = {
      id: project.responsible.id_integrant.toString(),
      nombre: nameParts[0] || project.responsible.name,
      apellidos: nameParts.slice(1).join(' ') || '',
      numeroIdentidad: '',
      correoElectronico: project.responsible.email || '',
      nombreUsuario: '',
      roles: [],
      esExterno: false,
      esAdministrador: false,
    }
  }
  
  // Mapear temática - usar el campo thematic directamente
  const tematica = project.thematic || ''
  
  // Mapear programa - usar national_group o international_group
  const programa = project.national_group || project.international_group || ''
  
  // Mapear tipo de proyecto
  const tipoProyecto = project.project_type?.name || project.type?.name || undefined
  
  // Mapear estado desde catálogo o relación embebida
  const estadoNombre = resolveProjectStateName(project, statesById)
  const estado = mapStateToFrontend(estadoNombre)
  
  // Mapear fechas
  const fechaInicio = project.initial_date || project.start_date || ''
  const fechaFin = project.final_date || project.end_date || undefined
  
  // Mapear aprobado
  const estaAprobado = project.approved !== undefined ? project.approved : (project.is_approved || false)
  
  return {
    id: project.id_project.toString(),
    nombre: project.title,
    descripcion: project.cientific_problem || '',
    responsable,
    tematica,
    programa,
    tipoProyecto,
    esPriorizado: project.is_prioritized || false,
    estaAprobado,
    estado,
    estadoNombre,
    fechaInicio,
    fechaFin,
    objetivos: project.objectives || project.main_objective || undefined,
    tareas: project.tasks || undefined,
    detallesCientificos: project.scientific_details || undefined,
    otrosDatos: project.other_data || undefined,
    criterioConsejo: project.council_criteria || project.conseil_criteria || undefined,
  }
}

// Función para mapear el estado del backend al slug de badge del frontend
const mapStateToFrontend = (state: string): "propuesta" | "activo" | "finalizado" | "cancelado" => {
  const normalized = state
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

  if (
    normalized.includes("propuesta") ||
    normalized.includes("pendiente") ||
    normalized.includes("borrador")
  ) {
    return "propuesta"
  }

  if (
    normalized.includes("activo") ||
    normalized.includes("progreso") ||
    normalized.includes("ejecuc") ||
    normalized.includes("aprobado")
  ) {
    return "activo"
  }

  if (
    normalized.includes("finaliz") ||
    normalized.includes("conclu") ||
    normalized.includes("terminad")
  ) {
    return "finalizado"
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("rechaz") ||
    normalized.includes("suspend")
  ) {
    return "cancelado"
  }

  return "propuesta"
}

const ProjectList: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { canCreateProjects, canManageAllProjects } = usePermissions()
  const [searchTerm, setSearchTerm] = useState("")
  const [projects, setProjects] = useState<IProject[]>([])
  const [projectStatesById, setProjectStatesById] = useState<Map<number, ProjectState>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showOnlyMyProjects, setShowOnlyMyProjects] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; projectId: string | null }>({
    show: false,
    projectId: null,
  })
  
  // Obtener user_id del localStorage
  const userId = localStorage.getItem('user_id') ? parseInt(localStorage.getItem('user_id')!) : null

  // Cargar catálogo de estados al montar
  useEffect(() => {
    const loadProjectStates = async () => {
      try {
        const states = await projectService.getProjectStates()
        setProjectStatesById(new Map(states.map((state) => [state.id_project_state, state])))
      } catch (err) {
        console.error("Error cargando estados de proyecto:", err)
      }
    }

    loadProjectStates()
  }, [])

  // Cargar proyectos al montar el componente o cambiar el filtro
  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true)
      try {
        const filters: any = {
          limit: 100,
        }
        
        // Si el checkbox está marcado y hay userId, filtrar por id_responsable
        if (showOnlyMyProjects && userId) {
          filters.responsible_id = userId
        }
        
        // Si hay término de búsqueda, agregarlo
        if (searchTerm.trim()) {
          filters.search = searchTerm.trim()
        }
        
        const fetchedProjects = await projectService.getAllProjects(filters)
        
        // Identificar IDs de responsables que necesitan ser cargados desde el endpoint
        const responsableIdsToLoad = new Set<number>()
        fetchedProjects.forEach(project => {
          // Si no viene responsible pero sí id_responsible, necesitamos cargarlo
          if (!project.responsible && project.id_responsible) {
            responsableIdsToLoad.add(project.id_responsible)
          }
          // Si viene responsible pero sin nombre completo, también cargarlo
          else if (project.responsible && (!project.responsible.name || project.responsible.name.trim() === '')) {
            responsableIdsToLoad.add(project.id_responsible)
          }
        })
        
        // Cargar los detalles de los responsables en paralelo
        const responsablesMap = new Map<number, IUser>()
        if (responsableIdsToLoad.size > 0) {
          const responsablePromises = Array.from(responsableIdsToLoad).map(id => 
            integrantService.getIntegrantById(id).catch(err => {
              console.warn(`Error cargando integrante ${id}:`, err)
              return null
            })
          )
          
          const responsables = await Promise.all(responsablePromises)
          
          responsables.forEach(integrant => {
            if (integrant) {
              const iUser = mapIntegrantToIUser(integrant)
              responsablesMap.set(integrant.id_integrant, iUser)
            }
          })
        }
        
        // Mapear proyectos y usar los responsables cargados cuando sea necesario
        const mappedProjects = fetchedProjects.map((project) => {
          const mapped = mapProjectToIProject(project, projectStatesById)
          
          // Si el responsable no tiene nombre completo, intentar obtenerlo del mapa
          if (mapped.responsable && (!mapped.responsable.nombre || mapped.responsable.nombre.trim() === '')) {
            const responsableId = parseInt(mapped.responsable.id)
            if (!isNaN(responsableId)) {
              const responsableCompleto = responsablesMap.get(responsableId)
              if (responsableCompleto) {
                return {
                  ...mapped,
                  responsable: responsableCompleto
                }
              }
            }
          }
          
          return mapped
        })
        
        setProjects(mappedProjects)
      } catch (err) {
        console.error("Error cargando proyectos:", err)
        showToast(err instanceof Error ? err.message : "Error al cargar los proyectos", "error")
      } finally {
        setLoading(false)
      }
    }

    // Debounce para la búsqueda
    const timeoutId = setTimeout(() => {
      loadProjects()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [showOnlyMyProjects, userId, searchTerm, projectStatesById])

  const filteredProjects = projects.filter((project) => {
    // La búsqueda ya se hace en el backend, pero podemos filtrar localmente también
    const matchesSearch =
      project.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.responsable && project.responsable.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesSearch
  })

  const isUserResponsible = (project: IProject) => {
    if (!userId) return false
    return project.responsable && parseInt(project.responsable.id) === userId
  }

  const canEditProject = (project: IProject) => {
    if (canManageAllProjects()) return true
    if (isUserResponsible(project)) return true
    return false
  }

  const handleDelete = async (projectId: string) => {
    try {
      await projectService.deleteProject(parseInt(projectId))
      // Recargar la lista después de eliminar
      const filters: any = {
        limit: 100,
      }
      if (showOnlyMyProjects && userId) {
        filters.responsible_id = userId
      }
      if (searchTerm.trim()) {
        filters.search = searchTerm.trim()
      }
      const fetchedProjects = await projectService.getAllProjects(filters)
      const mappedProjects = fetchedProjects.map((project) =>
        mapProjectToIProject(project, projectStatesById),
      )
      setProjects(mappedProjects)
      setDeleteConfirm({ show: false, projectId: null })
      showToast("Proyecto eliminado correctamente", "success")
    } catch (err) {
      console.error("Error eliminando proyecto:", err)
      showToast(err instanceof Error ? err.message : "Error al eliminar el proyecto", "error")
    }
  }

  const columns = [
    { key: "nombre", header: "Nombre" },
    {
      key: "responsable",
      header: "Responsable",
      render: (project: IProject) => 
        project.responsable 
          ? `${project.responsable.nombre} ${project.responsable.apellidos}`
          : 'Sin responsable',
    },
    { key: "tematica", header: "Temática" },
    { key: "programa", header: "Programa" },
    {
      key: "estado",
      header: "Estado",
      render: (project: IProject) => (
        <span className={`badge badge-${project.estado}`}>{project.estadoNombre}</span>
      ),
    },
    {
      key: "actions",
      header: "Opciones",
      render: (project: IProject) => (
        canEditProject(project) ? (
          <OptionsMenu
            onView={() => navigate(`/projects/${project.id}`)}
            onEdit={() => navigate(`/projects/${project.id}/edit`)}
            onDelete={() => setDeleteConfirm({ show: true, projectId: project.id })}
          />
        ) : (
          <Button variant="outline" onClick={() => navigate(`/projects/${project.id}`)}>
            Ver detalles
          </Button>
        )
      ),
    },
  ]

  return (
    <div className="list-page">
      <div className="page-toolbar list-page__toolbar">
        <p className="page-toolbar__lead">Gestión de proyectos de investigación de la institución.</p>
        {canCreateProjects() && (
          <Button onClick={() => navigate("/projects/new")}>
            <Plus size={20} />
            Adicionar Proyecto
          </Button>
        )}
      </div>

      <Card className="list-page__panel">
        <div className="list-page__filters">
          <div className="list-page__search">
            <Search size={20} aria-hidden />
            <Input
              type="text"
              placeholder="Buscar por nombre, responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar proyectos"
            />
          </div>
          <label className="list-page__checkbox">
            <input
              type="checkbox"
              checked={showOnlyMyProjects}
              onChange={(e) => setShowOnlyMyProjects(e.target.checked)}
            />
            <span>Mis proyectos</span>
          </label>
        </div>

        <div className="list-page__body">
          {loading ? (
            <div className="list-page__loading" role="status" aria-live="polite">
              <Loader2 className="animate-spin" size={32} aria-hidden />
              <span>Cargando proyectos...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="list-page__empty">
              <p>No se encontraron proyectos</p>
            </div>
          ) : (
            <>
              <p className="list-page__count">
                {filteredProjects.length}{" "}
                {filteredProjects.length === 1 ? "proyecto" : "proyectos"}
              </p>
              <Table data={filteredProjects} columns={columns} />
            </>
          )}
        </div>
      </Card>

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Eliminar Proyecto"
        message="¿Está seguro que desea eliminar este proyecto de investigación? Esta acción no se puede deshacer."
        onConfirm={() => deleteConfirm.projectId && handleDelete(deleteConfirm.projectId)}
        onCancel={() => setDeleteConfirm({ show: false, projectId: null })}
      />
    </div>
  )
}

export { ProjectList }
export default ProjectList
