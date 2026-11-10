"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { Card } from "../components/common/Card"
import { Button } from "../components/common/Button"
import { Input } from "../components/common/Input"
import { Modal } from "../components/common/Modal"
import { OptionsMenu } from "../components/common/OptionsMenu"
import { ConfirmDialog } from "../components/common/ConfirmDialog"
import "./GroupForm.css"
import { mockGroups } from "../services/mockData"
import { useAuthStore } from "../stores/authStore"
import { usePermissions } from "../hooks/usePermissions"
import { useRequirePermission } from "../hooks/useRequirePermission"
import { evaluationService } from "../services/evaluationService"
import { integrantGroupEvaluationService } from "../services/integrantGroupEvaluationService"
import type { Evaluation } from "../types/api/evaluation"
import type { IntegrantGroupEvaluation } from "../types/api/integrantGroupEvaluation"
import type { IUser } from "../types/index"
import { canEditGroupDetails } from "../utils/groupEditPermissions"
import {
  filterMemberIdsExcludingResponsable,
  isGroupResponsableIntegrant,
} from "../utils/groupMemberUtils"

const readUserFromLocalStorage = (): IUser | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("user")
    if (!raw) return null
    return JSON.parse(raw) as IUser
  } catch {
    return null
  }
}

const parseStoredIntegrantId = (): number | null => {
  if (typeof window === "undefined") return null
  const uid = localStorage.getItem("user_id")
  if (!uid) return null
  const n = parseInt(uid, 10)
  return Number.isNaN(n) ? null : n
}
import {
  recordMetadataService,
  type FacultyOption,
  type FacultyAreaOption,
  type IntegrantOption,
} from "../services/record/recordMetadataService"
import { groupService } from "../services/groupService"
import { useToast } from "../contexts/ToastContext"
import { integrantService } from "../services/integrantService"
import {
  IntegrantDetailsModal,
  type IntegrantDetailsFallback,
} from "../components/integrant/IntegrantDetailsModal"
import {
  validateRequired,
  validateEmailRequired,
  validateLength,
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

export const GroupForm = () => {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const { user: currentUserFromStore } = useAuthStore()
  const currentUser = currentUserFromStore ?? readUserFromLocalStorage()
  const { isAutor, canManageAllGroups, canCreateGroups } = usePermissions()

  const isAutorUser = isAutor()

  const isViewMode = id && !location.pathname.includes("/edit")
  const isEditMode = id && location.pathname.includes("/edit")
  const isNewMode = !id

  useRequirePermission(!isNewMode || canCreateGroups(), "/groups")

  const [isSaved, setIsSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<"datos" | "integrantes" | "evaluacion_integrantes">("datos")

  const [faculties, setFaculties] = useState<FacultyOption[]>([])
  const [facultyAreas, setFacultyAreas] = useState<FacultyAreaOption[]>([])
  const [selectedFacultyId, setSelectedFacultyId] = useState<number>(0)
  const [selectedFacultyAreaId, setSelectedFacultyAreaId] = useState<number>(0)
  const [isMetadataLoading, setIsMetadataLoading] = useState(true)
  const [metadataError, setMetadataError] = useState<string>("")

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    facultad: "",
    area: "",
    tematicas: "",
  })

  const [selectedResponsable, setSelectedResponsable] = useState<IUser | undefined>(undefined)
  const [selectedResponsableId, setSelectedResponsableId] = useState<number>(0)
  const [showResponsableModal, setShowResponsableModal] = useState(false)
  const responsableSearch = useIntegrantSearch()
  
  // Verificar si el usuario actual es responsable y es autor
  const isCurrentUserResponsable = Boolean(isEditMode && isAutorUser && selectedResponsableId && currentUser && 
                                   parseInt(currentUser.id) === selectedResponsableId)

  const [members, setMembers] = useState<any[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [externalMembers, setExternalMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any>(null)

  const [showModifyMemberModal, setShowModifyMemberModal] = useState(false)
  const [showIntegrantDetailsModal, setShowIntegrantDetailsModal] = useState(false)
  const [integrantDetailsId, setIntegrantDetailsId] = useState<number | null>(null)
  const [integrantDetailsFallback, setIntegrantDetailsFallback] =
    useState<IntegrantDetailsFallback | null>(null)
  const [showDirectoryModal, setShowDirectoryModal] = useState(false)
  const [showExternalModal, setShowExternalModal] = useState(false)
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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [groupEvaluationsList, setGroupEvaluationsList] = useState<IntegrantGroupEvaluation[]>([])
  const [evaluationTypesCatalog, setEvaluationTypesCatalog] = useState<Evaluation[]>([])
  const [evaluationsTabLoading, setEvaluationsTabLoading] = useState(false)
  const [evaluationsTabError, setEvaluationsTabError] = useState("")

  const [showAddEvaluationModal, setShowAddEvaluationModal] = useState(false)
  const [evalMemberSearchTerm, setEvalMemberSearchTerm] = useState("")
  const [evalFormSelectedMember, setEvalFormSelectedMember] = useState<{
    integrantId: number
    label: string
  } | null>(null)
  const [evalFormEvaluationId, setEvalFormEvaluationId] = useState<number | "">("")
  const [evalFormDescription, setEvalFormDescription] = useState("")
  const [evalFormSubmitting, setEvalFormSubmitting] = useState(false)
  const [evaluationModalMode, setEvaluationModalMode] = useState<"create" | "edit">("create")
  const [editingEvaluationRow, setEditingEvaluationRow] = useState<IntegrantGroupEvaluation | null>(null)
  const [deleteEvaluationDialogOpen, setDeleteEvaluationDialogOpen] = useState(false)
  const [evaluationPendingDelete, setEvaluationPendingDelete] = useState<IntegrantGroupEvaluation | null>(null)
  const [groupDetailsLoaded, setGroupDetailsLoaded] = useState(false)

  useEffect(() => {
    setGroupDetailsLoaded(false)
    setSelectedResponsableId(0)
    setSelectedResponsable(undefined)
    setMembers([])
  }, [id])

  const canManageGroupEvaluations = useMemo(() => {
    const roles = currentUser?.roles || []
    if (roles.includes("admin") || roles.includes("consejo")) return true

    const uidFromProfile = currentUser?.id ? parseInt(currentUser.id, 10) : NaN
    const uidFromStorage = parseStoredIntegrantId()
    const uid = !Number.isNaN(uidFromProfile) ? uidFromProfile : uidFromStorage ?? NaN
    if (Number.isNaN(uid)) return false

    /** Coincide con el responsable del grupo (`id_admin` / líder cargado desde la API). */
    const isAdministrativeResponsible =
      selectedResponsableId > 0 && uid === selectedResponsableId

    /** Responsable marcado en la tabla intermedia grupo–integrante (`admin` en miembro). */
    const isGroupResponsibleMember = members.some(
      (m) => m.integrantId === uid && m.admin === true,
    )

    /** Rol explícito de responsable de grupo en el mismo integrante que administra este grupo. */
    const hasResponsableGrupoRoleForThisGroup =
      roles.includes("responsable_grupo") &&
      (isAdministrativeResponsible || isGroupResponsibleMember)

    return (
      isAdministrativeResponsible ||
      isGroupResponsibleMember ||
      hasResponsableGrupoRoleForThisGroup
    )
  }, [currentUser, selectedResponsableId, members])

  const canEditCurrentGroup = useMemo(() => {
    if (!groupDetailsLoaded) return false
    return canEditGroupDetails(
      currentUser,
      selectedResponsableId > 0 ? selectedResponsableId : null,
      canManageAllGroups(),
    )
  }, [groupDetailsLoaded, currentUser, selectedResponsableId, canManageAllGroups])

  useEffect(() => {
    if (!isEditMode || !id || !groupDetailsLoaded) return
    if (!canEditCurrentGroup) {
      navigate(`/groups/${id}`, { replace: true })
    }
  }, [isEditMode, id, groupDetailsLoaded, canEditCurrentGroup, navigate])

  const loadEvaluationsTabData = useCallback(async () => {
    if (!id) return
    const groupId = parseInt(id, 10)
    if (Number.isNaN(groupId)) return
    setEvaluationsTabLoading(true)
    setEvaluationsTabError("")
    try {
      const [list, catalog] = await Promise.all([
        integrantGroupEvaluationService.getByFilters({ id_group: groupId }),
        evaluationService.getEvaluations(),
      ])
      setGroupEvaluationsList(list)
      setEvaluationTypesCatalog(catalog)
    } catch (err) {
      setEvaluationsTabError((err as Error).message || "No se pudieron cargar las evaluaciones")
    } finally {
      setEvaluationsTabLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (activeTab !== "evaluacion_integrantes" || !id || !canManageGroupEvaluations) return
    void loadEvaluationsTabData()
  }, [activeTab, id, canManageGroupEvaluations, loadEvaluationsTabData])

  useEffect(() => {
    if (activeTab === "evaluacion_integrantes" && !canManageGroupEvaluations) {
      setActiveTab("datos")
    }
  }, [activeTab, canManageGroupEvaluations])

  const getIntegrantDisplayNameById = useCallback(
    (integrantId: number) => {
      const member = members.find((m) => m.integrantId === integrantId)
      if (!member?.usuario) return `Integrante #${integrantId}`
      return `${member.usuario.nombre || ""} ${member.usuario.apellidos || ""}`.trim() || `Integrante #${integrantId}`
    },
    [members],
  )

  const getEvaluationNameById = useCallback(
    (evaluationId: number) => evaluationTypesCatalog.find((e) => e.id_evaluation === evaluationId)?.name || "—",
    [evaluationTypesCatalog],
  )

  const handleOpenAddEvaluationModal = () => {
    setEvaluationModalMode("create")
    setEditingEvaluationRow(null)
    setEvalMemberSearchTerm("")
    setEvalFormSelectedMember(null)
    setEvalFormEvaluationId("")
    setEvalFormDescription("")
    setShowAddEvaluationModal(true)
  }

  const handleCloseAddEvaluationModal = () => {
    setShowAddEvaluationModal(false)
    setEvaluationModalMode("create")
    setEditingEvaluationRow(null)
  }

  const handleOpenEditEvaluation = useCallback(
    (row: IntegrantGroupEvaluation) => {
      setEvaluationModalMode("edit")
      setEditingEvaluationRow(row)
      setEvalMemberSearchTerm("")
      setEvalFormSelectedMember({
        integrantId: row.id_integrant,
        label: getIntegrantDisplayNameById(row.id_integrant),
      })
      setEvalFormEvaluationId(row.id_evaluation)
      setEvalFormDescription(row.description ?? "")
      setShowAddEvaluationModal(true)
    },
    [getIntegrantDisplayNameById],
  )

  const handleAskDeleteEvaluation = (row: IntegrantGroupEvaluation) => {
    setEvaluationPendingDelete(row)
    setDeleteEvaluationDialogOpen(true)
  }

  const handleConfirmDeleteEvaluation = async () => {
    if (!evaluationPendingDelete) return
    try {
      await integrantGroupEvaluationService.remove(evaluationPendingDelete.id_integrant_group_evaluation)
            showToast("Evaluación eliminada correctamente.", "success")
      setDeleteEvaluationDialogOpen(false)
      setEvaluationPendingDelete(null)
      await loadEvaluationsTabData()
    } catch (err) {
            showToast(extractErrorMessage(err) || "Error al eliminar la evaluación", "error")
    }
  }

  const handleSubmitIntegrantEvaluation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    if (evaluationModalMode === "edit" && editingEvaluationRow) {
      if (evalFormEvaluationId === "" || evalFormEvaluationId === null) {
                showToast("Debe seleccionar obligatoriamente una evaluación del catálogo.", "error")
        return
      }
      try {
        setEvalFormSubmitting(true)
        await integrantGroupEvaluationService.update(editingEvaluationRow.id_integrant_group_evaluation, {
          id_evaluation: Number(evalFormEvaluationId),
          description: evalFormDescription.trim() ? evalFormDescription.trim() : null,
        })
                showToast("Evaluación actualizada correctamente.", "success")
        handleCloseAddEvaluationModal()
        await loadEvaluationsTabData()
      } catch (err) {
                showToast(extractErrorMessage(err) || "Error al actualizar la evaluación", "error")
      } finally {
        setEvalFormSubmitting(false)
      }
      return
    }

    if (!evalFormSelectedMember?.integrantId) {
            showToast("Debe buscar y seleccionar un integrante del grupo.", "error")
      return
    }

    if (evalFormEvaluationId === "" || evalFormEvaluationId === null) {
            showToast("Debe seleccionar obligatoriamente una evaluación del catálogo.", "error")
      return
    }

    const groupId = parseInt(id, 10)
    if (Number.isNaN(groupId)) return

    try {
      setEvalFormSubmitting(true)
      await integrantGroupEvaluationService.create({
        id_integrant: evalFormSelectedMember.integrantId,
        id_group: groupId,
        id_evaluation: Number(evalFormEvaluationId),
        description: evalFormDescription.trim() ? evalFormDescription.trim() : null,
      })
            showToast("Evaluación registrada correctamente.", "success")
      handleCloseAddEvaluationModal()
      await loadEvaluationsTabData()
    } catch (err) {
            showToast(extractErrorMessage(err) || "Error al crear la evaluación", "error")
    } finally {
      setEvalFormSubmitting(false)
    }
  }

  const filteredMembersForEvaluationSearch = useMemo(() => {
    const withId = members.filter((m) => m.integrantId != null) as Array<
      (typeof members)[0] & { integrantId: number }
    >
    const q = evalMemberSearchTerm.trim().toLowerCase()
    if (q.length < 2) return []
    return withId.filter((m) => {
      const label = `${m.usuario?.nombre || ""} ${m.usuario?.apellidos || ""} ${m.usuario?.correoElectronico || ""}`.toLowerCase()
      return label.includes(q)
    })
  }, [members, evalMemberSearchTerm])

  useEffect(() => {
    if (!showAddEvaluationModal || evaluationTypesCatalog.length > 0) return
    const load = async () => {
      try {
        const catalog = await evaluationService.getEvaluations()
        setEvaluationTypesCatalog(catalog)
      } catch {
        /* el usuario verá el error al enviar o al abrir la pestaña */
      }
    }
    void load()
  }, [showAddEvaluationModal, evaluationTypesCatalog.length])

  const renderEvaluacionIntegrantesTab = () => (
    <Card>
      <div className="tab-content">
        <div className="tab-header">
          <div>
            <h2>Evaluación de los integrantes</h2>
            <p>Registros de evaluación asociados a este grupo</p>
          </div>
          {canManageGroupEvaluations && (
            <div className="tab-actions">
              <Button type="button" variant="secondary" onClick={handleOpenAddEvaluationModal}>
                Agregar evaluación
              </Button>
            </div>
          )}
        </div>
        {evaluationsTabError ? <p className="error-message">{evaluationsTabError}</p> : null}
        {evaluationsTabLoading ? (
          <p className="empty-state">Cargando evaluaciones…</p>
        ) : (
          <div className="evaluations-table">
            <table>
              <thead>
                <tr>
                  <th>Integrante</th>
                  <th>Evaluación</th>
                  <th>Descripción</th>
                  {canManageGroupEvaluations ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {groupEvaluationsList.length === 0 ? (
                  <tr>
                    <td colSpan={canManageGroupEvaluations ? 4 : 3} className="empty-state">
                      No hay evaluaciones registradas para este grupo.
                    </td>
                  </tr>
                ) : (
                  groupEvaluationsList.map((row) => (
                    <tr key={row.id_integrant_group_evaluation}>
                      <td>{getIntegrantDisplayNameById(row.id_integrant)}</td>
                      <td>{getEvaluationNameById(row.id_evaluation)}</td>
                      <td>{row.description?.trim() ? row.description : "—"}</td>
                      {canManageGroupEvaluations ? (
                        <td>
                          <OptionsMenu
                            options={[
                              {
                                label: "Modificar",
                                onClick: () => handleOpenEditEvaluation(row),
                              },
                              {
                                label: "Eliminar",
                                className: "delete",
                                onClick: () => handleAskDeleteEvaluation(row),
                              },
                            ]}
                          />
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  )

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setIsMetadataLoading(true)
        setMetadataError("")
        const [facultiesResponse, areasResponse, countriesResponse] = await Promise.all([
          recordMetadataService.getFaculties(),
          recordMetadataService.getFacultyAreas(),
          recordMetadataService.getCountries(),
        ])
        setFaculties(facultiesResponse)
        setFacultyAreas(areasResponse)
        setCountries(countriesResponse)
      } catch (error) {
        setMetadataError((error as Error).message || "No se pudieron cargar los catálogos")
      } finally {
        setIsMetadataLoading(false)
      }
    }

    loadMetadata()
  }, [])

  useEffect(() => {
    const loadGroupData = async () => {
      if (id && (isViewMode || isEditMode)) {
        setGroupDetailsLoaded(false)
        try {
          const group = await groupService.getGroupById(parseInt(id))
          
          setFormData({
            nombre: group.name || "",
            descripcion: group.problems || "",
            facultad: group.faculty?.name || "",
            area: group.faculty_area?.name || "",
            tematicas: group.subjects || "",
          })
          
          if (group.leader) {
            setSelectedResponsableId(group.leader.id_integrant)
            setSelectedResponsable({
              id: String(group.leader.id_integrant),
              nombre: group.leader.name.split(" ")[0] || "",
              apellidos: group.leader.name.split(" ").slice(1).join(" ") || "",
              correoElectronico: group.leader.email || "",
              nombreUsuario: "",
              numeroIdentidad: "",
              roles: [],
              esExterno: false,
              esAdministrador: false,
            } as IUser)
          } else if (group.id_admin != null && group.id_admin !== undefined) {
            setSelectedResponsableId(group.id_admin)
            const responsableMember = group.members?.find((m) => m.id_integrant === group.id_admin)
            const displayName = responsableMember?.name || ""
            setSelectedResponsable({
              id: String(group.id_admin),
              nombre: displayName.split(" ")[0] || "",
              apellidos: displayName.split(" ").slice(1).join(" ") || "",
              correoElectronico: responsableMember?.integrant?.email || "",
              nombreUsuario: "",
              numeroIdentidad: "",
              roles: [],
              esExterno: false,
              esAdministrador: false,
            } as IUser)
          } else if (group.id_integrant) {
            setSelectedResponsableId(group.id_integrant)
          }
          
          setSelectedFacultyId(group.id_faculty)
          setSelectedFacultyAreaId(group.id_faculty_area||0)
          
          // Cargar miembros (con datos completos para distinguir externos)
          if (group.members) {
            const responsableIntegrantId =
              group.id_admin ?? group.leader?.id_integrant ?? group.id_integrant ?? null
            const membersWithoutResponsable = group.members.filter(
              (m) => !isGroupResponsableIntegrant(m.id_integrant, responsableIntegrantId),
            )
            const memberIds = membersWithoutResponsable.map((m) => m.id_integrant)
            setSelectedMemberIds(memberIds)

            const integrantCache = new Map<
              number,
              {
                name: string
                email?: string | null
                external: boolean
                identity?: string | null
                work_center?: string | null
              }
            >()

            const resolveMemberIntegrant = async (memberIntegrantId: number) => {
              if (integrantCache.has(memberIntegrantId)) {
                return integrantCache.get(memberIntegrantId)!
              }
              try {
                const integrant = await integrantService.getIntegrantById(memberIntegrantId)
                const summary = {
                  name: integrant.name,
                  email: integrant.email,
                  external: integrant.external,
                  identity: integrant.identity,
                  work_center: integrant.work_center,
                }
                integrantCache.set(memberIntegrantId, summary)
                return summary
              } catch {
                return null
              }
            }

            const mappedMembers = await Promise.all(
              membersWithoutResponsable.map(async (m, idx) => {
                const integrantInfo = await resolveMemberIntegrant(m.id_integrant)
                const fullName = integrantInfo?.name?.trim() || m.name?.trim() || ""
                return {
                  id: `member-${m.id_integrant || idx}`,
                  integrantId: m.id_integrant,
                  admin: m.admin,
                  usuario: {
                    id: String(m.id_integrant),
                    nombre: fullName.split(" ")[0] || "",
                    apellidos: fullName.split(" ").slice(1).join(" ") || "",
                    correoElectronico: integrantInfo?.email || m.integrant?.email || "",
                    nombreUsuario: "",
                    numeroIdentidad: integrantInfo?.identity || "",
                    entidad: integrantInfo?.work_center || "",
                    roles: [],
                    esExterno: integrantInfo?.external ?? false,
                    esAdministrador: false,
                  },
                  rol: "integrante_grupo",
                  evaluacion: null,
                  descripcionEvaluacion: "",
                }
              }),
            )
            setMembers(mappedMembers)
          }
          
          setIsSaved(true)
          setGroupDetailsLoaded(true)
        } catch (error) {
          console.error("Error cargando grupo:", error)
          setMetadataError((error as Error).message || "Error al cargar el grupo")
          setGroupDetailsLoaded(false)
        }
      }
    }
    
    loadGroupData()
  }, [id, isViewMode, isEditMode])

  // Filtrar áreas por facultad seleccionada
  const filteredFacultyAreas = facultyAreas.filter((area) => area.id_faculty === selectedFacultyId)

  const handleFacultyChange = (facultyId: string) => {
    const id = facultyId ? Number(facultyId) : null
    setSelectedFacultyId(id||0)
    setSelectedFacultyAreaId(0)
    const faculty = faculties.find((f) => f.id_faculty === id)
    setFormData({ ...formData, facultad: faculty?.name || "", area: "" })
  }

  const handleFacultyAreaChange = (areaId: string) => {
    const id = areaId ? Number(areaId) : null
    setSelectedFacultyAreaId(id||0)
    const area = facultyAreas.find((a) => a.id_faculty_area === id)
    setFormData({ ...formData, area: area?.name || "" })
  }

  const removeIntegrantFromMembers = (integrantId: number) => {
    setMembers((prev) => prev.filter((m) => m.integrantId !== integrantId))
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
            showToast("El responsable del grupo no puede agregarse como integrante", "error")
      return
    }
    if (selectedMemberIds.includes(integrant.id_integrant)) {
            showToast("Este integrante ya está agregado", "success")
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
      rol: "integrante_grupo",
      evaluacion: null,
      descripcionEvaluacion: "",
    }
    setMembers([...members, newMember])
    setSelectedMemberIds([...selectedMemberIds, integrant.id_integrant])
    memberSearch.setTerm("")
    setShowDirectoryModal(false)
        showToast("Integrante agregado con éxito", "success")
  }

  const handleSaveInitialData = (e: React.FormEvent) => {
    e.preventDefault()

    // Validar campos básicos
    const errors: Record<string, string> = {}
    const nombreError = validateRequired(formData.nombre, "Nombre del grupo")
    if (nombreError) errors.nombre = nombreError

    if (!selectedResponsable) {
      errors.responsable = "Debe seleccionar un responsable para el grupo"
    }

    if (!selectedFacultyId) {
      errors.facultad = "Debe seleccionar una facultad"
    }

    if (!selectedFacultyAreaId) {
      errors.area = "Debe seleccionar un área"
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
            showToast("Por favor, complete todos los campos requeridos", "error")
      return
    }

    setFieldErrors({})

    if (isEditMode && id) {
      const groupIndex = mockGroups.findIndex((g) => g.id === id)
      if (groupIndex !== -1) {
        mockGroups[groupIndex] = {
          ...mockGroups[groupIndex],
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          facultad: formData.facultad,
          area: formData.area,
          tematicas: formData.tematicas.split(",").map((t) => t.trim()),
          responsable: selectedResponsable,
          fechaActualizacion: new Date().toISOString(),
        }
                showToast("Datos iniciales actualizados con éxito", "success")
      }
      return
    }

    setIsSaved(true)
    setActiveTab("integrantes")
        showToast("Datos iniciales guardados", "success")
  }

  const handleAddExternalMember = (e: React.FormEvent) => {
    e.preventDefault()
    setExternalMemberEmailError(null)
    setExternalMemberCountryError(null)
    setExternalMemberIdentityError(null)

    const nombreErr = validateNameRequired(externalMember.nombre, "Nombre")
    const apellidosErr = validateNameRequired(externalMember.apellidos, "Apellidos")
    const entidadErr = validateRequired(externalMember.entidad, "Entidad")
    const emailErr = validateEmailRequired(externalMember.email, "Correo electrónico")
    const { countryError, identityError } = validateIdentityField(
      externalMember.numeroIdentidad,
      externalMember.id_country,
      countries,
    )

    if (nombreErr || apellidosErr || entidadErr || emailErr || countryError || identityError) {
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
      rol: "integrante_grupo",
      evaluacion: null,
      descripcionEvaluacion: "",
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

  const handleViewMemberDetails = (member: any) => {
    setIntegrantDetailsId(member.integrantId ?? null)
    setIntegrantDetailsFallback({
      nombre: member.usuario?.nombre,
      apellidos: member.usuario?.apellidos,
      correoElectronico: member.usuario?.correoElectronico,
      numeroIdentidad: member.usuario?.numeroIdentidad,
      entidad: member.usuario?.entidad,
      esExterno: member.usuario?.esExterno,
    })
    setShowIntegrantDetailsModal(true)
  }

  const handleModifyMember = (member: any) => {
    if (isEditMode && !member.usuario?.esExterno) {
      return
    }
    setSelectedMember(member)
    setShowModifyMemberModal(true)
  }

  const handleSaveModifiedMember = (e: React.FormEvent) => {
    e.preventDefault()
    setMembers(members.map((m) => (m.id === selectedMember.id ? selectedMember : m)))
    setShowModifyMemberModal(false)
    setSelectedMember(null)
        showToast("Integrante modificado con éxito", "success")
  }

  const handleRemoveMember = (memberId: string) => {
    const memberToRemove = members.find((m) => m.id === memberId)
    setMembers(members.filter((m) => m.id !== memberId))
    if (memberToRemove?.integrantId) {
      setSelectedMemberIds((prev) => prev.filter((id) => id !== memberToRemove.integrantId))
    }
    if (memberToRemove?.usuario?.esExterno) {
      setExternalMembers((prev) => prev.filter((m) => m.id !== memberId))
    }
  }

  const getIntegrantMenuOptions = (member: any, mode: "view" | "edit" | "manage") => {
    const viewDetails = {
      label: "Ver detalles",
      onClick: () => handleViewMemberDetails(member),
    }

    if (mode === "view") {
      return [viewDetails]
    }

    if (mode === "manage") {
      return [
        viewDetails,
        {
          label: "Modificar",
          onClick: () => handleModifyMember(member),
        },
        {
          label: "Eliminar integrante",
          onClick: () => handleRemoveMember(member.id),
        },
      ]
    }

    if (member.usuario?.esExterno) {
      return [
        viewDetails,
        {
          label: "Modificar",
          onClick: () => handleModifyMember(member),
        },
        {
          label: "Eliminar integrante",
          onClick: () => handleRemoveMember(member.id),
        },
      ]
    }

    return [viewDetails]
  }

  const handleSaveAllUpdates = async () => {
    if (!id) return

    const groupValidationErrors = validateGroupForm()
    if (Object.keys(groupValidationErrors).length > 0) {
      setSubmitError("Por favor, corrija los errores en el formulario antes de continuar")
            showToast(Object.values(groupValidationErrors).join(" · "), "error")
      return
    }

    try {
      setIsSubmitting(true)

      const now = new Date().toISOString()
      const memberIds = filterMemberIdsExcludingResponsable(
        selectedMemberIds,
        selectedResponsableId,
      )
      const payload = {
        name: formData.nombre,
        subjects: formData.tematicas || "",
        problems: formData.descripcion || "",
        id_admin: selectedResponsableId,
        id_faculty: selectedFacultyId,
        id_faculty_area: selectedFacultyAreaId,
        update_date: now,
        /** Ver `GroupUpdate` en backend/modules/group/schemas.py */
        member_update_ids: memberIds,
      }

      await groupService.updateGroupWithPayload(parseInt(id), payload)

            showToast("Grupo actualizado con éxito", "success")
      setTimeout(() => {
        navigate("/groups")
      }, 1500)
    } catch (error) {
      console.error("Error actualizando grupo:", error)
            showToast("Error al actualizar el grupo", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función para validar el formulario de grupo
  const validateGroupForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}

    // Validar nombre del grupo
    const nombreError = validateRequired(formData.nombre, "Nombre del grupo")
    if (nombreError) errors.nombre = nombreError

    // Validar longitud del nombre
    if (formData.nombre) {
      const nombreLengthError = validateLength(formData.nombre, 3, 200, "Nombre del grupo")
      if (nombreLengthError) errors.nombre = nombreLengthError
    }

    // Validar descripción
    if (formData.descripcion) {
      const descripcionError = validateLength(formData.descripcion, 20, 1000, "Descripción")
      if (descripcionError) errors.descripcion = descripcionError
    }

    // Validar temáticas
    if (formData.tematicas) {
      const tematicasError = validateLength(formData.tematicas, 5, 500, "Temáticas")
      if (tematicasError) errors.tematicas = tematicasError
    }

    // Validar responsable
    if (!selectedResponsableId) {
      errors.responsable = "Debe seleccionar un responsable para el grupo"
    }

    // Validar facultad
    if (!selectedFacultyId) {
      errors.facultad = "Debe seleccionar una facultad"
    }

    // Validar área
    if (!selectedFacultyAreaId) {
      errors.area = "Debe seleccionar un área"
    }

    if (
      selectedMemberIds.some((memberId) =>
        isGroupResponsableIntegrant(memberId, selectedResponsableId),
      )
    ) {
      errors.members = "El responsable del grupo no puede figurar como integrante"
    }

    // Validar emails e identidad de miembros externos
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

  const handleSaveCompleteGroup = async () => {
    const groupValidationErrors = validateGroupForm()
    if (Object.keys(groupValidationErrors).length > 0) {
      setSubmitError("Por favor, corrija los errores en el formulario antes de continuar")
            showToast(Object.values(groupValidationErrors).join(" · "), "error")
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)
      setFieldErrors({})

      const now = new Date().toISOString()

      const memberIds = filterMemberIdsExcludingResponsable(
        selectedMemberIds,
        selectedResponsableId,
      )

      if (isEditMode && id) {
        const updatePayload = {
          name: formData.nombre,
          subjects: formData.tematicas || "",
          problems: formData.descripcion || "",
          id_admin: selectedResponsableId,
          id_faculty: selectedFacultyId,
          update_date: now,
          member_update_ids: memberIds,
          id_faculty_area: selectedFacultyAreaId,
        }
        await groupService.updateGroupWithPayload(parseInt(id), updatePayload)
        showToast("Grupo actualizado con éxito", "success")
      } else {
        const createPayload = {
          name: formData.nombre,
          subjects: formData.tematicas || "",
          problems: formData.descripcion || "",
          id_admin: selectedResponsableId,
          id_faculty: selectedFacultyId,
          create_date: now,
          update_date: now,
          member_ids: memberIds,
          id_faculty_area: selectedFacultyAreaId,
        }
        await groupService.createGroup(createPayload)
        showToast("Grupo completado y guardado con éxito", "success")
      }

      setTimeout(() => {
        navigate("/groups")
      }, 1500)
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error) || "Error al guardar el grupo"
      setSubmitError(errorMessage)
      showToast(errorMessage, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="form-page group-form">

      <Modal
        isOpen={showResponsableModal}
        onClose={() => setShowResponsableModal(false)}
        title="Seleccionar Responsable del Grupo"
      >
        <div className="modal-content">
          <div className="form-group">
            <label>Buscar integrante CUJAE</label>
            <Input
              placeholder="Escribe un nombre, correo o centro de trabajo"
              value={responsableSearch.term}
              onChange={(e) => responsableSearch.setTerm(e.target.value)}
              aria-label="Campo para buscar responsable"
            />
            <small className="form-hint">
              Filtramos automáticamente contra el directorio en línea y puedes seleccionar los resultados.
            </small>
          </div>
          <div className="record-list">
            {responsableSearch.isLoading ? (
              <p className="empty-state">Buscando integrantes...</p>
            ) : responsableSearch.error ? (
              <p className="error-message">{responsableSearch.error}</p>
            ) : responsableSearch.results.length === 0 ? (
              <p className="empty-state">Escribe al menos 2 caracteres para obtener coincidencias</p>
            ) : (
              responsableSearch.results.map((integrant) => (
                <div key={integrant.id_integrant} className="record-item">
                  <div className="record-item-info">
                    <strong>{integrant.name}</strong>
                    <span>{integrant.email || "Sin correo"}</span>
                    <span>{integrant.work_center || "Sin centro de trabajo"}</span>
                  </div>
                  <Button
                    size="sm"
                    aria-label={`Seleccionar ${integrant.name} como responsable`}
                    onClick={() => handleSelectResponsableIntegrant(integrant)}
                  >
                    Seleccionar
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
        title="Agregar Integrante desde Directorio CUJAE"
      >
        <div className="modal-content">
          <div className="form-group">
            <label>Buscar integrante CUJAE</label>
            <Input
              placeholder="Escribe un nombre, correo o centro de trabajo"
              value={memberSearch.term}
              onChange={(e) => memberSearch.setTerm(e.target.value)}
              aria-label="Campo para buscar integrantes"
            />
            <small className="form-hint">
              Filtramos automáticamente contra el directorio en línea y puedes seleccionar los resultados.
            </small>
          </div>
          <div className="record-list">
            {memberSearch.isLoading ? (
              <p className="empty-state">Buscando integrantes...</p>
            ) : memberSearch.error ? (
              <p className="error-message">{memberSearch.error}</p>
            ) : memberSearch.results.length === 0 ? (
              <p className="empty-state">Escribe al menos 2 caracteres para obtener coincidencias</p>
            ) : (
              memberSearch.results.map((integrant) => {
                const isResponsable = isGroupResponsableIntegrant(
                  integrant.id_integrant,
                  selectedResponsableId,
                )

                return (
                <div key={integrant.id_integrant} className="record-item">
                  <div className="record-item-info">
                    <strong>{integrant.name}</strong>
                    <span>{integrant.email || "Sin correo"}</span>
                    <span>{integrant.work_center || "Sin centro de trabajo"}</span>
                    {isResponsable && (
                      <span className="form-hint">Ya es responsable del grupo</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    aria-label={
                      isResponsable
                        ? `${integrant.name} es responsable del grupo`
                        : `Agregar ${integrant.name} como integrante`
                    }
                    onClick={() => handleSelectMemberIntegrant(integrant)}
                    disabled={isResponsable}
                  >
                    {isResponsable ? "Responsable" : "Agregar"}
                  </Button>
                </div>
                )
              })
            )}
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
              placeholder="ejemplo@universidad.edu"
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

      <IntegrantDetailsModal
        isOpen={showIntegrantDetailsModal}
        onClose={() => {
          setShowIntegrantDetailsModal(false)
          setIntegrantDetailsId(null)
          setIntegrantDetailsFallback(null)
        }}
        integrantId={integrantDetailsId}
        fallback={integrantDetailsFallback}
      />

      <Modal
        isOpen={showModifyMemberModal}
        onClose={() => setShowModifyMemberModal(false)}
        title="Modificar Integrante"
      >
        {selectedMember && (
          <form onSubmit={handleSaveModifiedMember} className="modal-form">
            <div className="form-group">
              <label>Nombre *</label>
              <Input
                value={selectedMember.usuario.nombre}
                onChange={(e) =>
                  setSelectedMember({
                    ...selectedMember,
                    usuario: { ...selectedMember.usuario, nombre: e.target.value },
                  })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Apellidos *</label>
              <Input
                value={selectedMember.usuario.apellidos}
                onChange={(e) =>
                  setSelectedMember({
                    ...selectedMember,
                    usuario: { ...selectedMember.usuario, apellidos: e.target.value },
                  })
                }
                required
              />
            </div>
            {selectedMember.usuario.esExterno && (
              <div className="form-group">
                <label>Entidad</label>
                <Input
                  value={selectedMember.usuario.entidad || ""}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      usuario: { ...selectedMember.usuario, entidad: e.target.value },
                    })
                  }
                />
              </div>
            )}
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={() => setShowModifyMemberModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar cambios</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={showAddEvaluationModal}
        onClose={handleCloseAddEvaluationModal}
        title={
          evaluationModalMode === "edit"
            ? "Modificar evaluación"
            : "Agregar evaluación a integrante"
        }
      >
        <form onSubmit={handleSubmitIntegrantEvaluation} className="modal-form">
          {evaluationModalMode === "create" ? (
            <>
              <div className="form-group">
                <label htmlFor="evalMemberSearch">Buscar integrante del grupo</label>
                <Input
                  id="evalMemberSearch"
                  placeholder="Escribe al menos 2 caracteres (nombre, apellidos o correo)"
                  value={evalMemberSearchTerm}
                  onChange={(e) => {
                    setEvalMemberSearchTerm(e.target.value)
                    setEvalFormSelectedMember(null)
                  }}
                  aria-label="Campo para buscar entre los integrantes del grupo"
                />
                <small className="form-hint">
                  Solo integrantes CUJAE del grupo (con identificador en el sistema).
                </small>
              </div>
              {evalFormSelectedMember ? (
                <p className="form-hint" style={{ marginBottom: "0.75rem" }}>
                  Seleccionado: <strong>{evalFormSelectedMember.label}</strong>
                </p>
              ) : null}
              <div className="record-list" role="listbox" aria-label="Resultados de búsqueda de integrantes del grupo">
                {evalMemberSearchTerm.trim().length < 2 ? (
                  <p className="empty-state">Escriba al menos 2 caracteres para filtrar integrantes del grupo.</p>
                ) : filteredMembersForEvaluationSearch.length === 0 ? (
                  <p className="empty-state">No hay coincidencias entre los integrantes de este grupo.</p>
                ) : (
                  filteredMembersForEvaluationSearch.map((m) => {
                    const label = `${m.usuario?.nombre || ""} ${m.usuario?.apellidos || ""}`.trim()
                    return (
                      <div key={m.id} className="record-item">
                        <div className="record-item-info">
                          <strong>{label || "Sin nombre"}</strong>
                          <span>{m.usuario?.correoElectronico || "Sin correo"}</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          aria-label={`Seleccionar ${label} para la evaluación`}
                          onClick={() =>
                            setEvalFormSelectedMember({
                              integrantId: m.integrantId as number,
                              label: label || `Integrante #${m.integrantId}`,
                            })
                          }
                        >
                          Seleccionar
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <div className="form-group">
              <span className="input-label">Integrante</span>
              <p className="form-hint" style={{ marginTop: "0.35rem" }}>
                <strong>{evalFormSelectedMember?.label ?? "—"}</strong>
              </p>
              <small className="form-hint">Para cambiar el integrante, elimine esta evaluación y cree una nueva.</small>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="evalCatalogSelect">Evaluación *</label>
            <select
              id="evalCatalogSelect"
              className="form-select"
              value={evalFormEvaluationId === "" ? "" : String(evalFormEvaluationId)}
              onChange={(e) => {
                const v = e.target.value
                setEvalFormEvaluationId(v === "" ? "" : Number(v))
              }}
              aria-required="true"
              aria-label="Seleccionar tipo de evaluación del catálogo"
            >
              <option value="">Seleccione una evaluación…</option>
              {evaluationTypesCatalog.map((ev) => (
                <option key={ev.id_evaluation} value={ev.id_evaluation}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="evalDescription">Descripción (opcional)</label>
            <textarea
              id="evalDescription"
              className="form-textarea"
              rows={3}
              value={evalFormDescription}
              onChange={(e) => setEvalFormDescription(e.target.value)}
              placeholder="Comentarios adicionales sobre la evaluación"
              aria-label="Descripción opcional de la evaluación"
            />
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={handleCloseAddEvaluationModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={evalFormSubmitting}>
              {evalFormSubmitting
                ? evaluationModalMode === "edit"
                  ? "Guardando…"
                  : "Creando…"
                : evaluationModalMode === "edit"
                  ? "Guardar cambios"
                  : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteEvaluationDialogOpen}
        title="Eliminar evaluación"
        message={
          evaluationPendingDelete
            ? `¿Eliminar la evaluación de «${getIntegrantDisplayNameById(evaluationPendingDelete.id_integrant)}» (${getEvaluationNameById(evaluationPendingDelete.id_evaluation)})? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={() => void handleConfirmDeleteEvaluation()}
        onCancel={() => {
          setDeleteEvaluationDialogOpen(false)
          setEvaluationPendingDelete(null)
        }}
      />

      <div className="page-toolbar form-page__toolbar">
        <p className="page-toolbar__lead">
          {isViewMode
            ? "Detalles del grupo de investigación"
            : isEditMode
              ? "Modifique la información del grupo"
              : "Complete la información del grupo"}
        </p>
      </div>

      {isMetadataLoading && (
        <Card>
          <p>Cargando catálogos iniciales...</p>
        </Card>
      )}

      {metadataError && (
        <Card>
          <p className="error-message">{metadataError}</p>
        </Card>
      )}

      {!isMetadataLoading && !metadataError && !isViewMode && !isEditMode && !isSaved && (
        <>
          <Card>
            <form onSubmit={handleSaveInitialData}>
              <div className="form-section">
                <h3>Datos Iniciales</h3>
                <div className="form-group">
                  <label>Nombre del Grupo *</label>
                  <Input
                    name="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Grupo de Investigación en IA"
                    required
                  />
                  {fieldErrors.nombre && <span className="field-error">{fieldErrors.nombre}</span>}
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describa el enfoque y objetivos del grupo"
                    className="form-textarea"
                    rows={4}
                  />
                </div>
                <div className="form-group">
                  <label>Facultad</label>
                  {isMetadataLoading ? (
                    <Input name="facultad" value="Cargando..." disabled />
                  ) : (
                    <select
                      name="facultad"
                      value={selectedFacultyId ?? ""}
                      onChange={(e) => handleFacultyChange(e.target.value)}
                      className="form-select"
                      disabled={faculties.length === 0}
                    >
                      <option value="">Seleccione una facultad</option>
                      {faculties.map((faculty) => (
                        <option key={faculty.id_faculty} value={faculty.id_faculty}>
                          {faculty.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {fieldErrors.facultad && <span className="field-error">{fieldErrors.facultad}</span>}
                </div>
                <div className="form-group">
                  <label>Área</label>
                  {isMetadataLoading ? (
                    <Input name="area" value="Cargando..." disabled />
                  ) : (
                    <select
                      name="area"
                      value={selectedFacultyAreaId ?? ""}
                      onChange={(e) => handleFacultyAreaChange(e.target.value)}
                      className="form-select"
                      disabled={!selectedFacultyId || filteredFacultyAreas.length === 0}
                    >
                      <option value="">Seleccione un área</option>
                      {filteredFacultyAreas.map((area) => (
                        <option key={area.id_faculty_area} value={area.id_faculty_area}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Temáticas (separadas por comas)</label>
                  <Input
                    name="tematicas"
                    value={formData.tematicas}
                    onChange={(e) => setFormData({ ...formData, tematicas: e.target.value })}
                    placeholder="Ej: IA, Machine Learning, NLP"
                  />
                </div>
                <div className="form-group">
                  <label>Responsable del Grupo *</label>
                  <div className="responsable-selector">
                    {selectedResponsable ? (
                      <div className="selected-responsable">
                        <span>{`${selectedResponsable.nombre} ${selectedResponsable.apellidos}${selectedResponsable.facultad ? ` - ${selectedResponsable.facultad}` : ''}`}</span>
                        {!isEditMode && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowResponsableModal(true)}
                            disabled={isCurrentUserResponsable}
                          >
                            Cambiar
                          </Button>
                        )}
                      </div>
                    ) : (
                      !isEditMode && (
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={() => setShowResponsableModal(true)}
                          disabled={isCurrentUserResponsable}
                        >
                          Seleccionar Responsable
                        </Button>
                      )
                    )}
                    {isEditMode && selectedResponsable && (
                      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                        El responsable no puede ser modificado
                      </p>
                    )}
                    {isCurrentUserResponsable && (
                      <p className="form-hint" style={{ color: '#c33', marginTop: '0.5rem' }}>
                        Como autor, no puede cambiar el responsable del grupo
                      </p>
                    )}
                  </div>
                  {fieldErrors.responsable && <span className="field-error">{fieldErrors.responsable}</span>}
                </div>
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => navigate("/groups")}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar Datos Iniciales</Button>
                </div>
              </div>
            </form>
          </Card>

          <div className="form-info">
            <p>
              <strong>Nota:</strong> Después de guardar el grupo, podrá agregar integrantes, asociar registros
              científicos y gestionar evaluaciones.
            </p>
          </div>
        </>
      )}

      {!isViewMode && !isEditMode && isSaved && (
        <>
          <div className="form-tabs">
            <button
              className={`tab-button ${activeTab === "datos" ? "active" : ""}`}
              onClick={() => setActiveTab("datos")}
            >
              Datos Iniciales
            </button>
            <button
              className={`tab-button ${activeTab === "integrantes" ? "active" : ""}`}
              onClick={() => setActiveTab("integrantes")}
            >
              Integrantes
            </button>
            {/* <button
              className={`tab-button ${activeTab === "evaluaciones" ? "active" : ""}`}
              onClick={() => setActiveTab("evaluaciones")}
            >
              Evaluaciones
            </button> */}
          </div>

          {activeTab === "datos" && (
            <Card>
              <div className="initial-data-section">
                <div className="data-header">
                  <h2>Datos Iniciales del Grupo</h2>
                  <p>Información básica guardada</p>
                </div>
                <div className="data-display">
                  <div className="data-item">
                    <label>Nombre del Grupo</label>
                    <p className="data-value">{formData.nombre}</p>
                  </div>
                  <div className="data-item full-width">
                    <label>Descripción</label>
                    <p className="data-value">{formData.descripcion || "No especificada"}</p>
                  </div>
                  <div className="data-item">
                    <label>Facultad</label>
                    <p className="data-value">{formData.facultad || "No especificada"}</p>
                  </div>
                  <div className="data-item">
                    <label>Área</label>
                    <p className="data-value">{formData.area || "No especificada"}</p>
                  </div>
                  <div className="data-item full-width">
                    <label>Temáticas</label>
                    <p className="data-value">{formData.tematicas || "No especificadas"}</p>
                  </div>
                  <div className="data-item">
                    <label>Responsable</label>
                    <p className="data-value">
                      {selectedResponsable
                        ? `${selectedResponsable.nombre} ${selectedResponsable.apellidos}`
                        : "No asignado"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "integrantes" && (
            <Card>
              <div className="tab-content">
                <div className="tab-header">
                  <h2>Gestión de Integrantes</h2>
                  <div className="tab-actions">
                    <Button variant="secondary" onClick={() => setShowDirectoryModal(true)}>
                      Agregar integrante (Directorio CUJAE)
                    </Button>
                    <Button variant="secondary" onClick={() => { setExternalMemberEmailError(null); setShowExternalModal(true) }}>
                      Agregar integrante (Externo de la CUJAE)
                    </Button>
                  </div>
                </div>

                <div className="members-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Rol</th>
                        <th>Tipo</th>
                        {!isNewMode && <th>Opciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={isNewMode ? 3 : 4} className="empty-state">
                            No hay integrantes asociados. Haga clic en "Agregar integrante" para comenzar.
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => (
                          <tr key={member.id}>
                            <td>{`${member.usuario.nombre} ${member.usuario.apellidos}`}</td>
                            <td>{member.rol.replace(/_/g, " ")}</td>
                            <td>{member.usuario.esExterno ? "Externo" : "CUJAE"}</td>
                            {!isNewMode && (
                              <td>
                                <OptionsMenu
                                  options={getIntegrantMenuOptions(member, "manage")}
                                />
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* {activeTab === "evaluaciones" && (
            <Card>
              <div className="tab-content">
                <div className="tab-header">
                  <h2>Evaluaciones de Integrantes</h2>
                  <p>Evalúe el desempeño de los integrantes del grupo</p>
                </div>

                <div className="evaluations-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Integrante</th>
                        <th>Evaluación</th>
                        <th>Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="empty-state">
                            No hay integrantes para evaluar. Agregue integrantes primero.
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => {
                          const evaluation = evaluations[member.id] || { evaluacion: "no_evaluado", descripcion: "" }
                          return (
                            <tr key={member.id}>
                              <td>{`${member.usuario.nombre} ${member.usuario.apellidos}`}</td>
                              <td>
                                <select
                                  className="form-select"
                                  value={evaluation.evaluacion}
                                  onChange={(e) =>
                                    setEvaluations({
                                      ...evaluations,
                                      [member.id]: { ...evaluation, evaluacion: e.target.value },
                                    })
                                  }
                                >
                                  <option value="no_evaluado">No evaluado</option>
                                  <option value="mal">Mal</option>
                                  <option value="regular">Regular</option>
                                  <option value="bien">Bien</option>
                                  <option value="excelente">Excelente</option>
                                </select>
                              </td>
                              <td>
                                <Input
                                  type="text"
                                  placeholder="Descripción de la evaluación"
                                  value={evaluation.descripcion}
                                  onChange={(e) =>
                                    setEvaluations({
                                      ...evaluations,
                                      [member.id]: { ...evaluation, descripcion: e.target.value },
                                    })
                                  }
                                />
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )} */}

          <Card>
            <div className="form-actions">
              {submitError && <p className="error-message">{submitError}</p>}
              <Button type="button" onClick={handleSaveCompleteGroup} disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar Grupo Completo"}
              </Button>
            </div>
          </Card>
        </>
      )}

      {isViewMode && (
        <>
          <div className="form-tabs">
            <button
              type="button"
              className={`tab-button ${activeTab === "datos" ? "active" : ""}`}
              onClick={() => setActiveTab("datos")}
            >
              Datos Iniciales
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === "integrantes" ? "active" : ""}`}
              onClick={() => setActiveTab("integrantes")}
            >
              Integrantes
            </button>
            {canManageGroupEvaluations ? (
              <button
                type="button"
                className={`tab-button ${activeTab === "evaluacion_integrantes" ? "active" : ""}`}
                onClick={() => setActiveTab("evaluacion_integrantes")}
              >
                Evaluación de los integrantes
              </button>
            ) : null}
          </div>

          {activeTab === "datos" && (
            <Card>
              <div className="tab-content">
                <div className="initial-data-section">
                  <div className="data-header">
                    <h2>Datos Iniciales del Grupo</h2>
                    <p>Información básica del grupo de investigación</p>
                  </div>
                  <div className="data-display">
                    <div className="data-item">
                      <label>Nombre del Grupo</label>
                      <p className="data-value">{formData.nombre}</p>
                    </div>
                    <div className="data-item full-width">
                      <label>Descripción</label>
                      <p className="data-value">{formData.descripcion || "No especificada"}</p>
                    </div>
                    <div className="data-item">
                      <label>Facultad</label>
                      <p className="data-value">{formData.facultad || "No especificada"}</p>
                    </div>
                    <div className="data-item">
                      <label>Área</label>
                      <p className="data-value">{formData.area || "No especificada"}</p>
                    </div>
                    <div className="data-item full-width">
                      <label>Temáticas</label>
                      <p className="data-value">{formData.tematicas || "No especificadas"}</p>
                    </div>
                    <div className="data-item">
                      <label>Responsable</label>
                      <p className="data-value">
                        {selectedResponsable
                          ? `${selectedResponsable.nombre} ${selectedResponsable.apellidos}`
                          : "No asignado"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "integrantes" && (
            <Card>
              <div className="tab-content">
                <div className="tab-header">
                  <h2>Gestión de Integrantes</h2>
                </div>

                <div className="members-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Rol</th>
                        <th>Tipo</th>
                        <th>Opciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="empty-state">
                            No hay integrantes asociados. Haga clic en "Agregar integrante" para comenzar.
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => (
                          <tr key={member.id}>
                            <td>{`${member.usuario?.nombre || ""} ${member.usuario?.apellidos || ""}`}</td>
                            <td>{member.rol?.replace(/_/g, " ") || "integrante_grupo"}</td>
                            <td>{member.usuario?.esExterno ? "Externo" : "CUJAE"}</td>
                            <td>
                              <OptionsMenu
                                options={getIntegrantMenuOptions(member, "view")}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "evaluacion_integrantes" && canManageGroupEvaluations && renderEvaluacionIntegrantesTab()}

          <Card>
            <div className="form-actions">
              <Button onClick={() => navigate("/groups")}>Volver a Grupos</Button>
              {groupDetailsLoaded && canEditCurrentGroup ? (
                <Button type="button" onClick={() => navigate(`/groups/${id}/edit`)}>
                  Editar Grupo
                </Button>
              ) : null}
            </div>
          </Card>
        </>
      )}

      {isEditMode && (
        <>
          <div className="form-tabs">
            <button
              type="button"
              className={`tab-button ${activeTab === "datos" ? "active" : ""}`}
              onClick={() => setActiveTab("datos")}
            >
              Datos Iniciales
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === "integrantes" ? "active" : ""}`}
              onClick={() => setActiveTab("integrantes")}
            >
              Integrantes
            </button>
            {canManageGroupEvaluations ? (
              <button
                type="button"
                className={`tab-button ${activeTab === "evaluacion_integrantes" ? "active" : ""}`}
                onClick={() => setActiveTab("evaluacion_integrantes")}
              >
                Evaluación de los integrantes
              </button>
            ) : null}
          </div>

          {activeTab === "datos" && (
            <Card>
              <form onSubmit={handleSaveInitialData}>
                <div className="form-group">
                  <label>Nombre del Grupo *</label>
                  <Input
                    name="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Grupo de Investigación en IA"
                    required
                  />
                  {fieldErrors.nombre && <span className="field-error">{fieldErrors.nombre}</span>}
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describa el enfoque y objetivos del grupo"
                    className="form-textarea"
                  />
                </div>
                <div className="form-group">
                  <label>Facultad *</label>
                  {isMetadataLoading ? (
                    <Input name="facultad" value="Cargando..." disabled />
                  ) : (
                    <select
                      name="facultad"
                      value={selectedFacultyId ?? ""}
                      onChange={(e) => handleFacultyChange(e.target.value)}
                      className="form-select"
                      required
                      disabled={faculties.length === 0}
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
                  <label>Área *</label>
                  {isMetadataLoading ? (
                    <Input name="area" value="Cargando..." disabled />
                  ) : (
                    <select
                      name="area"
                      value={selectedFacultyAreaId ?? ""}
                      onChange={(e) => handleFacultyAreaChange(e.target.value)}
                      className="form-select"
                      required
                      disabled={!selectedFacultyId || filteredFacultyAreas.length === 0}
                    >
                      <option value="">Seleccione un área</option>
                      {filteredFacultyAreas.map((area) => (
                        <option key={area.id_faculty_area} value={area.id_faculty_area}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Temáticas</label>
                  <Input
                    name="tematicas"
                    value={formData.tematicas}
                    onChange={(e) => setFormData({ ...formData, tematicas: e.target.value })}
                    placeholder="Ej: IA, Machine Learning, NLP"
                  />
                </div>
                <div className="form-group">
                  <label>Responsable del Grupo *</label>
                  <div className="responsable-selector">
                    {selectedResponsable ? (
                      <div className="selected-responsable">
                        <span>{`${selectedResponsable.nombre} ${selectedResponsable.apellidos}${selectedResponsable.facultad ? ` - ${selectedResponsable.facultad}` : ''}`}</span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowResponsableModal(true)}
                          disabled={isCurrentUserResponsable}
                        >
                          Cambiar
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => setShowResponsableModal(true)}
                        disabled={isCurrentUserResponsable}
                      >
                        Seleccionar Responsable
                      </Button>
                    )}
                    {isCurrentUserResponsable && (
                      <p className="form-hint" style={{ color: '#c33', marginTop: '0.5rem' }}>
                        Como autor, no puede cambiar el responsable del grupo
                      </p>
                    )}
                  </div>
                </div>
              </form>
            </Card>
          )}

          {activeTab === "integrantes" && (
            <Card>
              <div className="tab-content">
                <div className="tab-header">
                  <h2>Gestión de Integrantes</h2>
                  <div className="tab-actions">
                    <Button variant="secondary" onClick={() => setShowDirectoryModal(true)}>
                      Agregar integrante (Directorio CUJAE)
                    </Button>
                    <Button variant="secondary" onClick={() => { setExternalMemberEmailError(null); setShowExternalModal(true) }}>
                      Agregar integrante (Externo de la CUJAE)
                    </Button>
                  </div>
                </div>

                <div className="members-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Rol</th>
                        <th>Tipo</th>
                        <th>Opciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="empty-state">
                            No hay integrantes asociados. Haga clic en "Agregar integrante" para comenzar.
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => (
                          <tr key={member.id}>
                            <td>{`${member.usuario.nombre} ${member.usuario.apellidos}`}</td>
                            <td>{member.rol.replace(/_/g, " ")}</td>
                            <td>{member.usuario.esExterno ? "Externo" : "CUJAE"}</td>
                            <td>
                              <OptionsMenu
                                options={getIntegrantMenuOptions(member, "edit")}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "evaluacion_integrantes" && canManageGroupEvaluations && renderEvaluacionIntegrantesTab()}

          <Card>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => navigate("/groups")}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveAllUpdates} disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Actualizar Grupo"}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
