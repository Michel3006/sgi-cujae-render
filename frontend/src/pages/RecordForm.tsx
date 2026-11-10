"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { Card } from "../components/common/Card"
import { Button } from "../components/common/Button"
import { Input } from "../components/common/Input"
import { Modal } from "../components/common/Modal"
import { OptionsMenu } from "../components/common/OptionsMenu"
import type { RecordType } from "../types"
import "./RecordForm.css"
import { groupService } from "../services/groupService"
import { projectService } from "../services/projectService"
import { useGroupSearch, useProjectSearch } from "../hooks/useGroupProjectSearch"
import {
  GroupProjectAssignFields,
  type LinkedEntity,
} from "../components/record/GroupProjectAssignFields"
import type { Group } from "../types/api/group"
import type { Project } from "../types/api/project"
import { useAuthStore } from "../stores/authStore"
import {
  recordMetadataService,
  type CountryOption,
  type IntegrantOption,
  type NamedOption,
} from "../services/record/recordMetadataService"
import { recordService } from "../services/record/recordService"
import { integrantService } from "../services/integrantService"
import {
  buildAuthorIdsFromAuthors,
  isExternalRecordAuthor,
  resolveArticleAuthorIdsForUpdate,
} from "../utils/articleAuthorSync"
import type { UserRole } from "../types"
import type {
  Registro,
  ArticuloRegistro,
  LibroRegistro,
  MonografiaRegistro,
  NormaRegistro,
  PatenteRegistro,
  SoftwareRegistro,
  TesisRegistro,
  EventoRegistro,
  PremioRegistro,
} from "../types/recordList/Registros"
import { recordDetailService } from "../services/record/recordDetailService"
import { usePermissions } from "../hooks/usePermissions"
import { useRequirePermission } from "../hooks/useRequirePermission"
import { useEditFormDirty } from "../hooks/useEditFormDirty"
import { useToast } from "../contexts/ToastContext"
import { ConfirmDialog } from "../components/common/ConfirmDialog"
import { ZenodoPublishModal } from "../components/zenodo/ZenodoPublishModal"
import {
  extractEntityIdFromResponse,
  mapRecordTypeToEntityType,
  canPublishRecordToZenodo,
} from "../utils/zenodoEntityMapper"
import { zenodoService } from "../services/zenodoService"
import type { ZenodoPublishTarget } from "../types/zenodo"
import {
  validateRequired,
  validateEmailRequired,
  validateDOINormalized,
  validateISSN,
  validateISBN,
  validateYear,
  validateAuthors,
  validateThesisAuthorsNotTutors,
  buildThesisRoleConflictMessage,
  validateKeywords,
  validateNameRequired,
  validateLength,
  validatePages,
  extractErrorMessage,
  isDuplicateIdentifierError,
  getDuplicateIdentifierMessage,
} from "../utils/validation"
import {
  IdentityDocumentField,
  validateIdentityField,
} from "../components/common/IdentityDocumentField"
import { scrollToFirstFormError, scrollToFormError } from "../utils/scrollToFormError"
import { normalizeDoiValue } from "../utils/doiUtils"
import {
  buildArticlePayload,
  buildBookPayload,
  buildEventPayload,
  buildMonographPayload,
  buildNormPayload,
  buildPatentPayload,
  buildPrizePayload,
  buildSoftwarePayload,
  buildThesisPayload,
  resolveTypeIds,
  type RecordPayloadContext,
} from "../utils/recordPayloadBuilders"
type IntegrantSearchHook = {
  term: string
  setTerm: (value: string) => void
  results: IntegrantOption[]
  isLoading: boolean
  error: string | null
}

type RecordFormLocationState = {
  record?: Registro
}

const RECORD_TYPES: RecordType[] = [
  "articulo",
  "libro",
  "monografia",
  "norma",
  "patente",
  "software",
  "evento",
  "premio",
  "tesis",
]

const isRecordTypeValue = (value: string | null | undefined): value is RecordType =>
  Boolean(value && RECORD_TYPES.includes(value as RecordType))

const parseCompositeRecordId = (rawId?: string | null) => {
  if (!rawId) return null
  const [maybeType, ...rest] = rawId.split("-")
  if (isRecordTypeValue(maybeType) && rest.length > 0) {
    return {
      type: maybeType,
      id: rest.join("-"),
    }
  }
  return {
    type: null,
    id: rawId,
  }
}

const createInitialFormData = () => ({
  titulo: "",
  tituloCapitulo: "",
  año: new Date().getFullYear(),
  mes: new Date().getMonth() + 1,
  resumen: "",
  palabrasClave: "",
  pais: "Cuba",
  tipoArticulo: "",
  tipoNorma: "",
  revista: "",
  issn: "",
  volumen: "",
  numero: "",
  paginas: "",
  doi: "",
  editorial: "",
  isbn: "",
  tipoTesis: "",
  numeroRegistro: "",
  estado: "",
  registroCENDA: "",
  nombreEvento: "",
  organizador: "",
  tipoEvento: "",
  tipoPremio: "",
  institucion: "",
})

type RecordFormState = ReturnType<typeof createInitialFormData>

const splitFullName = (fullName: string) => {
  if (!fullName.trim()) {
    return { firstName: fullName, lastName: "" }
  }
  const [firstName, ...rest] = fullName.trim().split(" ")
  return {
    firstName,
    lastName: rest.join(" "),
  }
}

const mapAuthorsFromRecord = async (record: Registro) => {
  const authorsList = record.autores || []

  return Promise.all(
    authorsList.map(async (author, index) => {
      const { firstName, lastName } = splitFullName(author.name || "")
      let external = false
      let entidad = ""
      let numeroIdentidad = ""
      let id_country: number | null = null

      if (author.id_integrant) {
        try {
          const integrant = await integrantService.getIntegrantById(author.id_integrant)
          external = integrant.external === true
          entidad = integrant.work_center || ""
          numeroIdentidad = integrant.identity || ""
          id_country = integrant.id_country ?? null
        } catch (error) {
          console.error("Error cargando integrante del autor:", error)
        }
      }

      return {
        id: `author-${author.id_integrant ?? index}`,
        integrantId: author.id_integrant,
        usuario: {
          id: author.id_integrant ? String(author.id_integrant) : `author-${index}`,
          nombre: firstName || "Autor",
          apellidos: lastName,
          correoElectronico: author.email || "",
          nombreUsuario: "",
          numeroIdentidad,
          entidad,
          id_country,
          roles: [],
          esExterno: external,
          esAdministrador: false,
        },
        nombre: firstName || "Autor",
        apellidos: lastName,
        esExterno: external,
        esPrincipal: index === 0,
        orden: index + 1,
      }
    }),
  )
}

const mapTutorsFromRecord = (record: TesisRegistro) => {
  return (record.tutors || []).map((tutor, index) => {
    const { firstName, lastName } = splitFullName(tutor.name || "")
    return {
      id: `tutor-${tutor.id_integrant ?? index}`,
      integrantId: tutor.id_integrant,
      usuario: {
        id: tutor.id_integrant ? String(tutor.id_integrant) : `tutor-${index}`,
        nombre: firstName || "Tutor",
        apellidos: lastName,
        correoElectronico: "",
        nombreUsuario: "",
        numeroIdentidad: "",
        roles: [],
        esExterno: false,
        esAdministrador: false,
      },
      nombre: firstName || "Tutor",
      apellidos: lastName,
      esExterno: false,
      esPrincipal: index === 0,
      orden: index + 1,
    }
  })
}

const mapRecordToFormData = (record: Registro): RecordFormState => {
  const base = createInitialFormData()
  base.titulo = record.titulo || base.titulo
  base.año = record.year_only || base.año
  base.mes = record.month_only || base.mes
  base.resumen = record.resume || base.resumen
  base.palabrasClave = record.keywords || base.palabrasClave
  base.pais = record.country?.name || base.pais

  switch (record.tipo) {
    case "articulo": {
      const article = record as ArticuloRegistro
      base.revista = article.journal || base.revista
      base.volumen = article.voulume || base.volumen
      base.paginas = article.pages || base.paginas
      base.numero = article.number || base.numero
      base.doi = article.doi || base.doi
      base.issn = article.issn || base.issn
      base.tipoArticulo =
        (article.article_type && (article.article_type.name || article.article_type.description)) || base.tipoArticulo
      break
    }
    case "libro": {
      const book = record as LibroRegistro
      base.tituloCapitulo = book.chapter_title || base.tituloCapitulo
      base.editorial = book.publisher || book.editor || base.editorial
      base.volumen = book.voulume || base.volumen
      base.numero = book.number || base.numero
      base.paginas = book.pages || base.paginas
      base.isbn = book.isbn || base.isbn
      break
    }
    case "monografia": {
      const monograph = record as MonografiaRegistro
      base.isbn = monograph.isbn || base.isbn
      base.paginas = monograph.pages || base.paginas
      base.numero = monograph.number || base.numero
      base.registroCENDA = monograph.cenda || base.registroCENDA
      break
    }
    case "norma": {
      const norm = record as NormaRegistro
      base.numeroRegistro = norm.registration_number || base.numeroRegistro
      base.paginas = norm.pages || base.paginas
      base.tipoNorma = (norm.norm_type && (norm.norm_type.name || norm.norm_type.description)) || base.tipoNorma
      break
    }
    case "patente": {
      const patent = record as PatenteRegistro
      base.numeroRegistro = patent.reg_number || base.numeroRegistro
      base.estado = patent.is_conceded ? "concedida" : "tramite"
      break
    }
    case "software": {
      const software = record as SoftwareRegistro
      base.registroCENDA = software.number || base.registroCENDA
      base.estado = software.is_conceded ? "registrado" : ""
      break
    }
    case "evento": {
      const encounter = record as EventoRegistro
      base.nombreEvento = encounter.encounter_name || base.nombreEvento
      base.organizador = encounter.organizer || base.organizador
      base.tipoEvento =
        (encounter.encounter_type && (encounter.encounter_type.name || encounter.encounter_type.description)) ||
        base.tipoEvento
      break
    }
    case "premio": {
      const prize = record as PremioRegistro
      base.tipoPremio = (prize.prize_type && (prize.prize_type.name || prize.prize_type.description)) || base.tipoPremio
      base.institucion = prize.grant_institution || base.institucion
      break
    }
    case "tesis": {
      const thesis = record as TesisRegistro
      base.institucion = thesis.institution || base.institucion
      base.tipoTesis = (thesis.thesis_type && (thesis.thesis_type.name || thesis.thesis_type.description)) || base.tipoTesis
      break
    }
    default:
      break
  }

  return base
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
export const RecordForm = () => {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()

  const locationState = (location.state as RecordFormLocationState | null) ?? null
  const recordFromLocation = locationState?.record ?? null
  const parsedRecordKey = parseCompositeRecordId(id)
  const recordNumericId = parsedRecordKey?.id ?? null

  const { user: currentUser } = useAuthStore()
  const { canCreateRecords, canPublishToZenodo, canModifyRecord } = usePermissions()
  const isAdmin = currentUser?.roles?.includes("admin") || false

  const isEditMode = Boolean(id && location.pathname.includes("/edit"))
  const isViewMode = Boolean(id && !location.pathname.includes("/edit"))
  const isNewRecord = !id

  useRequirePermission(!isNewRecord || canCreateRecords(), "/records")

  const [recordType, setRecordType] = useState<RecordType>(
    (parsedRecordKey?.type as RecordType | undefined) ??
      (recordFromLocation?.tipo as RecordType | undefined) ??
      "articulo"
  )
  const effectiveRecordType = (parsedRecordKey?.type ?? recordType) as RecordType
  const [recordData, setRecordData] = useState<Registro | null>(recordFromLocation ?? null)
  const editPermissionReady = !isEditMode || recordData !== null
  const currentIntegrantId = (() => {
    const uid = localStorage.getItem("user_id")
    if (!uid) return null
    const parsed = parseInt(uid, 10)
    return Number.isNaN(parsed) ? null : parsed
  })()
  const isCurrentUserRecordAuthor = Boolean(
    currentIntegrantId &&
      recordData?.autores?.some((autor) => autor.id_integrant === currentIntegrantId),
  )
  const editDeniedRedirect =
    isEditMode && id ? location.pathname.replace(/\/edit$/, "") || "/records" : "/records"

  useRequirePermission(
    !isEditMode || !editPermissionReady || canModifyRecord(isCurrentUserRecordAuthor),
    editDeniedRedirect,
  )

  const [recordLoading, setRecordLoading] = useState(false)
  const [recordLoadError, setRecordLoadError] = useState<string | null>(null)
  const [recordEditBaselineReady, setRecordEditBaselineReady] = useState(false)
  const [linkedEntitiesHydrated, setLinkedEntitiesHydrated] = useState(false)
  const [zenodoHydrationDone, setZenodoHydrationDone] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [activeTab, setActiveTab] = useState("datos-basicos")

  const [authors, setAuthors] = useState<any[]>([])
  const [tutors, setTutors] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState<LinkedEntity | null>(null)
  const [selectedProject, setSelectedProject] = useState<LinkedEntity | null>(null)
  const [showExternalModal, setShowExternalModal] = useState(false)
  const [modalType, setModalType] = useState<"author" | "tutor">("author")
  const [externalPerson, setExternalPerson] = useState({
    nombre: "",
    apellidos: "",
    numeroIdentidad: "",
    entidad: "",
    email: "",
    id_country: null as number | null,
  })
  const [externalPersonEmailError, setExternalPersonEmailError] = useState<string | null>(null)
  const [externalPersonCountryError, setExternalPersonCountryError] = useState<string | null>(null)
  const [externalPersonIdentityError, setExternalPersonIdentityError] = useState<string | null>(null)
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [articleTypes, setArticleTypes] = useState<NamedOption[]>([])
  const [normTypes, setNormTypes] = useState<NamedOption[]>([])
  const [prizeTypes, setPrizeTypes] = useState<NamedOption[]>([])
  const [thesisTypes, setThesisTypes] = useState<NamedOption[]>([])
  const [encounterTypes, setEncounterTypes] = useState<NamedOption[]>([])
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null)
  const [selectedArticleTypeId, setSelectedArticleTypeId] = useState<number | null>(null)
  const [selectedNormTypeId, setSelectedNormTypeId] = useState<number | null>(null)
  const [selectedPrizeTypeId, setSelectedPrizeTypeId] = useState<number | null>(null)
  const [selectedThesisTypeId, setSelectedThesisTypeId] = useState<number | null>(null)
  const [selectedEncounterTypeId, setSelectedEncounterTypeId] = useState<number | null>(null)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [isMetadataLoading, setIsMetadataLoading] = useState(true)
  const [metadataReloadKey, setMetadataReloadKey] = useState(0)
  const [editingExternalId, setEditingExternalId] = useState<string | null>(null)
  const [selectedAuthorIds, setSelectedAuthorIds] = useState<number[]>([])
  const [selectedTutorIds, setSelectedTutorIds] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showZenodoConfirm, setShowZenodoConfirm] = useState(false)
  const [showZenodoModal, setShowZenodoModal] = useState(false)
  const [zenodoTarget, setZenodoTarget] = useState<ZenodoPublishTarget | null>(null)
  const [pendingNavigation, setPendingNavigation] = useState(false)
  const [isZenodoPublished, setIsZenodoPublished] = useState(false)

  const authorSearch = useIntegrantSearch()
  const tutorSearch = useIntegrantSearch()
  const groupSearch = useGroupSearch()
  const projectSearch = useProjectSearch()

  const [formData, setFormData] = useState<RecordFormState>(createInitialFormData)
  const formDataRef = useRef(formData)

  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  const isEditingExistingArticle =
    recordType === "articulo" && recordNumericId !== null
  const hasPersistedArticleDoi =
    isEditingExistingArticle && Boolean(normalizeDoiValue(formData.doi))
  const isDoiLocked = isZenodoPublished || hasPersistedArticleDoi

  const recordTypes: { value: RecordType; label: string }[] = [
    { value: "articulo", label: "Artículo" },
    { value: "libro", label: "Libro" },
    { value: "monografia", label: "Monografía" },
    { value: "norma", label: "Norma" },
    { value: "patente", label: "Patente" },
    { value: "software", label: "Software" },
    { value: "evento", label: "Evento" },
    { value: "premio", label: "Premio" },
    { value: "tesis", label: "Tesis" },
  ]

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setIsMetadataLoading(true)
        setMetadataError(null)
        const [
          countriesResponse,
          prizeTypesResponse,
          thesisTypesResponse,
          articleTypesResponse,
          normTypesResponse,
          encounterTypesResponse,
        ] = await Promise.all([
          recordMetadataService.getCountries(),
          recordMetadataService.getPrizeTypes(),
          recordMetadataService.getThesisTypes(),
          recordMetadataService.getArticleTypes(),
          recordMetadataService.getNormTypes(),
          recordMetadataService.getEncounterTypes(),
        ])
        setCountries(countriesResponse)
        setPrizeTypes(prizeTypesResponse)
        setThesisTypes(thesisTypesResponse)
        setArticleTypes(articleTypesResponse)
        setNormTypes(normTypesResponse)
        setEncounterTypes(encounterTypesResponse)
      } catch (error) {
        const message = (error as Error).message || "No se pudieron cargar los catálogos"
        setMetadataError(message)
        showToast(message, "error")
      } finally {
        setIsMetadataLoading(false)
      }
    }

    loadMetadata()
  }, [metadataReloadKey])

  useEffect(() => {
    if (!parsedRecordKey?.id) return
    setFormData(createInitialFormData())
    setAuthors([])
    setSelectedAuthorIds([])
    setTutors([])
    setSelectedTutorIds([])
    setSelectedGroup(null)
    setSelectedProject(null)
    groupSearch.setTerm("")
    projectSearch.setTerm("")
    setIsSaved(false)
    setRecordLoadError(null)
    setRecordEditBaselineReady(false)
    setLinkedEntitiesHydrated(false)
    setZenodoHydrationDone(false)
  }, [parsedRecordKey?.id])

  useEffect(() => {
    if (id) return
    setRecordData(null)
    setFormData(createInitialFormData())
    setAuthors([])
    setSelectedAuthorIds([])
    setTutors([])
    setSelectedTutorIds([])
    setSelectedGroup(null)
    setSelectedProject(null)
    groupSearch.setTerm("")
    projectSearch.setTerm("")
    setIsSaved(false)
    setRecordLoadError(null)
    setSelectedCountryId(null)
    setSelectedArticleTypeId(null)
    setSelectedNormTypeId(null)
    setSelectedPrizeTypeId(null)
    setSelectedThesisTypeId(null)
    setSelectedEncounterTypeId(null)
    setRecordType("articulo")
  }, [id])

  useEffect(() => {
    if (!id) return
    if (parsedRecordKey?.type) return
    const message = "No se pudo determinar el tipo de registro. Acceda desde la lista e inténtelo nuevamente."
    setRecordLoadError(message)
    showToast(message, "error")
  }, [id, parsedRecordKey?.type])

  useEffect(() => {
    if (!recordFromLocation) return
    setRecordData(recordFromLocation)
    setRecordLoadError(null)
    setRecordLoading(false)
  }, [recordFromLocation])

  useEffect(() => {
    if (!parsedRecordKey?.id || !parsedRecordKey.type) return

    if (
      recordFromLocation &&
      recordFromLocation.id === parsedRecordKey.id &&
      recordFromLocation.tipo === parsedRecordKey.type
    ) {
      return
    }

    let isMounted = true
    setRecordLoading(true)
    setRecordLoadError(null)

    recordDetailService
      .getRecord(parsedRecordKey.type, parsedRecordKey.id)
      .then((record) => {
        if (!isMounted) return
        setRecordData(record)
      })
      .catch((error) => {
        if (!isMounted) return
        const message = error.message || "No se pudo cargar la información del registro seleccionado"
        setRecordLoadError(message)
        showToast(message, "error")
      })
      .finally(() => {
        if (!isMounted) return
        setRecordLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [parsedRecordKey?.id, parsedRecordKey?.type, recordFromLocation])

  useEffect(() => {
    const recordTypeForZenodo = effectiveRecordType
    if (recordTypeForZenodo !== "articulo" || !recordNumericId) {
      setIsZenodoPublished(false)
      setZenodoHydrationDone(true)
      return
    }

    const entityId = Number(recordNumericId)
    if (Number.isNaN(entityId)) {
      setIsZenodoPublished(false)
      setZenodoHydrationDone(true)
      return
    }

    let isMounted = true
    setZenodoHydrationDone(false)

    zenodoService
      .getPublication("article", entityId)
      .then((publication) => {
        if (!isMounted) return
        const isPublished = publication?.status === "published"
        setIsZenodoPublished(isPublished)
        if (isPublished) {
          const publishedDoi = normalizeDoiValue(publication?.doi)
          if (publishedDoi) {
            setFormData((prev) => ({ ...prev, doi: publishedDoi }))
          }
        }
      })
      .catch(() => {
        if (!isMounted) return
        setIsZenodoPublished(false)
      })
      .finally(() => {
        if (!isMounted) return
        setZenodoHydrationDone(true)
      })

    return () => {
      isMounted = false
    }
  }, [effectiveRecordType, recordNumericId, recordData?.id])

  useEffect(() => {
    if (!recordData) {
      setRecordEditBaselineReady(false)
      setLinkedEntitiesHydrated(false)
      return
    }

    setRecordEditBaselineReady(false)
    setLinkedEntitiesHydrated(false)
    setRecordLoadError(null)
    setRecordType(recordData.tipo as RecordType)
    setIsSaved(true)

    const hydratedForm = mapRecordToFormData(recordData)
    setFormData(hydratedForm)

    const loadAuthors = async () => {
      const mappedAuthors = await mapAuthorsFromRecord(recordData)
      setAuthors(mappedAuthors)
      setSelectedAuthorIds(
        mappedAuthors
          .map((author) => author.integrantId)
          .filter((value): value is number => typeof value === "number"),
      )
    }

    void loadAuthors()

    if (recordData.tipo === "tesis") {
      const thesisTutors = mapTutorsFromRecord(recordData as TesisRegistro)
      setTutors(thesisTutors)
      setSelectedTutorIds(
        thesisTutors
          .map((tutor) => tutor.integrantId)
          .filter((value): value is number => typeof value === "number")
      )
    } else {
      setTutors([])
      setSelectedTutorIds([])
    }

    setSelectedCountryId(recordData.id_country ?? null)

    if (recordData.tipo === "articulo") {
      const article = recordData as ArticuloRegistro
      setSelectedArticleTypeId(article.article_type?.id_article_type ?? null)
    } else {
      setSelectedArticleTypeId(null)
    }

    if (recordData.tipo === "norma") {
      const norm = recordData as NormaRegistro
      setSelectedNormTypeId(norm.norm_type?.id_norm_type ?? null)
    } else {
      setSelectedNormTypeId(null)
    }

    if (recordData.tipo === "premio") {
      const prize = recordData as PremioRegistro
      setSelectedPrizeTypeId(prize.prize_type?.id_prize_type ?? null)
    } else {
      setSelectedPrizeTypeId(null)
    }

    if (recordData.tipo === "tesis") {
      const thesis = recordData as TesisRegistro
      setSelectedThesisTypeId(thesis.thesis_type?.id_thesis_type ?? null)
    } else {
      setSelectedThesisTypeId(null)
    }

    if (recordData.tipo === "evento") {
      const encounter = recordData as EventoRegistro
      setSelectedEncounterTypeId(encounter.encounter_type?.id_encounter_type ?? null)
    } else {
      setSelectedEncounterTypeId(null)
    }

    const loadLinkedGroupAndProject = async () => {
      if (recordData.id_group) {
        try {
          const group = await groupService.getGroupById(recordData.id_group)
          setSelectedGroup({ id: group.id_group, label: group.name })
          groupSearch.setTerm(group.name)
        } catch {
          setSelectedGroup({ id: recordData.id_group, label: `Grupo #${recordData.id_group}` })
          groupSearch.setTerm("")
        }
      } else {
        setSelectedGroup(null)
        groupSearch.setTerm("")
      }

      if (recordData.id_project) {
        try {
          const project = await projectService.getProjectById(recordData.id_project)
          setSelectedProject({ id: project.id_project, label: project.title })
          projectSearch.setTerm(project.title)
        } catch {
          setSelectedProject({
            id: recordData.id_project,
            label: `Proyecto #${recordData.id_project}`,
          })
          projectSearch.setTerm("")
        }
      } else {
        setSelectedProject(null)
        projectSearch.setTerm("")
      }

      setLinkedEntitiesHydrated(true)
    }

    void loadLinkedGroupAndProject()
  }, [recordData])

  useEffect(() => {
    if (!isEditMode || !recordData || recordLoading || isMetadataLoading) {
      setRecordEditBaselineReady(false)
      return
    }

    if (!linkedEntitiesHydrated || !zenodoHydrationDone || countries.length === 0) {
      setRecordEditBaselineReady(false)
      return
    }

    if (selectedCountryId === null) {
      const countryName = recordData.country?.name || formData.pais
      const countryMatch = countries.find((country) => country.name === countryName)
      if (countryMatch) {
        setSelectedCountryId(countryMatch.id_country)
        return
      }
    }

    setRecordEditBaselineReady(true)
  }, [
    isEditMode,
    recordData,
    recordLoading,
    isMetadataLoading,
    linkedEntitiesHydrated,
    zenodoHydrationDone,
    countries,
    selectedCountryId,
    formData.pais,
  ])

  useEffect(() => {
    if (!countries.length || selectedCountryId) {
      return
    }
    const countryMatch = countries.find((country) => country.name === formData.pais)
    if (countryMatch) {
      setSelectedCountryId(countryMatch.id_country)
      return
    }
    if (isEditMode || isViewMode) {
      return
    }
    const fallbackCountry = countries[0]
    if (fallbackCountry) {
      setSelectedCountryId(fallbackCountry.id_country)
      setFormData((prev) => ({
        ...prev,
        pais: fallbackCountry.name,
      }))
    }
  }, [countries, formData.pais, selectedCountryId, isEditMode, isViewMode])

  useEffect(() => {
    if (isEditMode || isViewMode || isSaved) {
      return
    }
    setSelectedArticleTypeId(null)
    setSelectedNormTypeId(null)
    setSelectedPrizeTypeId(null)
    setSelectedThesisTypeId(null)
    setSelectedEncounterTypeId(null)
  }, [recordType, isEditMode, isViewMode, isSaved])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isEditMode) {
      void handleUpdateRecord()
      return
    }

    setIsSaved(true)
    setActiveTab("autores")
    showToast("Datos básicos guardados con éxito. Complete autores y, si aplica, grupo o proyecto.", "success")
  }

  const getAuthorIdsForUpdate = (): number[] =>
    authors
      .map((author) => author.integrantId)
      .filter((id): id is number => typeof id === "number")

  const buildPayloadContext = (
    recordTypeForPayload: RecordType,
    authorIds: number[],
    options?: { includeDoi?: boolean },
  ): RecordPayloadContext => {
    const resolvedTypes = resolveTypeIds(
      recordTypeForPayload,
      formDataRef.current,
      {
        selectedArticleTypeId,
        selectedNormTypeId,
        selectedPrizeTypeId,
        selectedThesisTypeId,
        selectedEncounterTypeId,
      },
      {
        articleTypes,
        normTypes,
        prizeTypes,
        thesisTypes,
        encounterTypes,
      },
    )

    return {
      formData: formDataRef.current,
      authorIds,
      tutorIds: selectedTutorIds,
      selectedCountryId,
      ...resolvedTypes,
      id_group: selectedGroup?.id ?? null,
      id_project: selectedProject?.id ?? null,
      includeDoi: options?.includeDoi ?? !isDoiLocked,
    }
  }

  const notifyThesisRoleConflict = (message: string, fieldKey: "authors" | "tutors") => {
    showToast(message, "error")
    setFieldErrors((prev) => ({ ...prev, [fieldKey]: message }))
    scrollToFormError({ fieldKey, setActiveTab, recordType })
  }

  const handleSelectIntegrant = (integrant: IntegrantOption, type: "author" | "tutor") => {
    const alreadySelected =
      type === "author"
        ? selectedAuthorIds.includes(integrant.id_integrant)
        : selectedTutorIds.includes(integrant.id_integrant)

    if (alreadySelected) {
      showToast(
        type === "author"
          ? "Este integrante ya forma parte de los autores"
          : "Este integrante ya está registrado como tutor",
        "error",
      )
      return
    }

    if (recordType === "tesis") {
      if (type === "tutor" && selectedAuthorIds.includes(integrant.id_integrant)) {
        notifyThesisRoleConflict(
          buildThesisRoleConflictMessage(integrant.name, "tutor"),
          "tutors",
        )
        return
      }
      if (type === "author" && selectedTutorIds.includes(integrant.id_integrant)) {
        notifyThesisRoleConflict(
          buildThesisRoleConflictMessage(integrant.name, "author"),
          "authors",
        )
        return
      }
    }

    const { firstName, lastName } = splitFullName(integrant.name)
    const newPerson = {
      id: `${type}-${integrant.id_integrant}-${Date.now()}`,
      integrantId: integrant.id_integrant,
      usuario: {
        id: integrant.id_integrant,
        nombre: firstName,
        apellidos: lastName,
        correoElectronico: integrant.email,
        lugarTrabajo: integrant.work_center,
        esExterno: false,
      },
      nombre: firstName,
      apellidos: lastName,
      esExterno: false,
      esPrincipal: type === "author" ? authors.length === 0 : false,
      orden: type === "author" ? authors.length + 1 : tutors.length + 1,
    }

    if (type === "author") {
      setAuthors([...authors, newPerson])
      setSelectedAuthorIds([...selectedAuthorIds, integrant.id_integrant])
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.authors
        return next
      })
    } else {
      setTutors([...tutors, newPerson])
      setSelectedTutorIds([...selectedTutorIds, integrant.id_integrant])
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.tutors
        return next
      })
    }

    showToast(type === "author" ? "Autor agregado con éxito" : "Tutor agregado con éxito", "success")
  }

  const handleCountryChange = (value: string) => {
    if (!value) {
      setSelectedCountryId(null)
      setFormData((prev) => ({
        ...prev,
        pais: "",
      }))
      return
    }
    const parsedId = Number(value)
    setSelectedCountryId(parsedId)
    const selectedCountry = countries.find((country) => country.id_country === parsedId)
    setFormData((prev) => ({
      ...prev,
      pais: selectedCountry ? selectedCountry.name : "",
    }))
  }

  const handleArticleTypeChange = (value: string) => {
    const parsedId = value ? Number(value) : null
    setSelectedArticleTypeId(parsedId)
    const selectedType = articleTypes.find((type) => type.id === parsedId)
    setFormData((prev) => ({
      ...prev,
      tipoArticulo: selectedType ? selectedType.name : "",
    }))
  }

  const handleThesisTypeChange = (value: string) => {
    const parsedId = value ? Number(value) : null
    setSelectedThesisTypeId(parsedId)
    const selectedType = thesisTypes.find((type) => type.id === parsedId)
    setFormData((prev) => ({
      ...prev,
      tipoTesis: selectedType ? selectedType.name : "",
    }))
  }

  const handlePrizeTypeChange = (value: string) => {
    const parsedId = value ? Number(value) : null
    setSelectedPrizeTypeId(parsedId)
    const selectedType = prizeTypes.find((type) => type.id === parsedId)
    setFormData((prev) => ({
      ...prev,
      tipoPremio: selectedType ? selectedType.name : "",
    }))
  }

  const handleEncounterTypeChange = (value: string) => {
    const parsedId = value ? Number(value) : null
    setSelectedEncounterTypeId(parsedId)
    const selectedType = encounterTypes.find((type) => type.id === parsedId)
    setFormData((prev) => ({
      ...prev,
      tipoEvento: selectedType ? selectedType.name : "",
    }))
  }

  const handleNormTypeChange = (value: string) => {
    const parsedId = value ? Number(value) : null
    setSelectedNormTypeId(parsedId)
    const selectedType = normTypes.find((type) => type.id === parsedId)
    setFormData((prev) => ({
      ...prev,
      tipoNorma: selectedType ? selectedType.name : "",
    }))
  }

  const clearExternalModalErrors = () => {
    setExternalPersonEmailError(null)
    setExternalPersonCountryError(null)
    setExternalPersonIdentityError(null)
  }

  const resetExternalModal = () => {
    setShowExternalModal(false)
    setEditingExternalId(null)
    setExternalPerson({
      nombre: "",
      apellidos: "",
      numeroIdentidad: "",
      entidad: "",
      email: "",
      id_country: null,
    })
    clearExternalModalErrors()
  }

  const openCreateExternalModal = (type: "author" | "tutor") => {
    setModalType(type)
    setEditingExternalId(null)
    setExternalPerson({
      nombre: "",
      apellidos: "",
      numeroIdentidad: "",
      entidad: "",
      email: "",
      id_country: null,
    })
    clearExternalModalErrors()
    setShowExternalModal(true)
  }

  const openEditExternalModal = (type: "author" | "tutor", person: (typeof authors)[number]) => {
    setModalType(type)
    setEditingExternalId(person.id)
    setExternalPerson({
      nombre: person.nombre ?? "",
      apellidos: person.apellidos ?? "",
      numeroIdentidad: person.usuario?.numeroIdentidad ?? "",
      entidad: person.usuario?.entidad ?? "",
      email: person.usuario?.correoElectronico ?? "",
      id_country: person.usuario?.id_country ?? null,
    })
    clearExternalModalErrors()
    setShowExternalModal(true)
  }

  const handleSubmitExternal = (e: React.FormEvent) => {
    e.preventDefault()
    clearExternalModalErrors()

    const nombreErr = validateNameRequired(externalPerson.nombre, "Nombre")
    const apellidosErr = validateNameRequired(externalPerson.apellidos, "Apellidos")
    const entidadErr = validateRequired(externalPerson.entidad, "Entidad")
    const emailErr = validateEmailRequired(externalPerson.email, "Correo electrónico")
    const { countryError, identityError } = validateIdentityField(
      externalPerson.numeroIdentidad,
      externalPerson.id_country,
      countries,
    )

    if (nombreErr || apellidosErr || entidadErr || emailErr || countryError || identityError) {
      if (emailErr) setExternalPersonEmailError(emailErr)
      if (countryError) setExternalPersonCountryError(countryError)
      if (identityError) setExternalPersonIdentityError(identityError)
      return
    }

    const trimmedPerson = {
      nombre: externalPerson.nombre.trim(),
      apellidos: externalPerson.apellidos.trim(),
      numeroIdentidad: externalPerson.numeroIdentidad.trim(),
      entidad: externalPerson.entidad.trim(),
      correoElectronico: externalPerson.email.trim(),
      id_country: externalPerson.id_country,
    }

    const handleThesisRoleConflict = (message: string) => {
      const fieldKey = modalType === "author" ? "authors" : "tutors"
      showToast(message, "error")
      setFieldErrors((prev) => ({ ...prev, [fieldKey]: message }))
    }

    if (editingExternalId) {
      const updatePerson = (person: (typeof authors)[number]) => {
        if (person.id !== editingExternalId) return person
        return {
          ...person,
          nombre: trimmedPerson.nombre,
          apellidos: trimmedPerson.apellidos,
          usuario: {
            ...person.usuario,
            nombre: trimmedPerson.nombre,
            apellidos: trimmedPerson.apellidos,
            numeroIdentidad: trimmedPerson.numeroIdentidad,
            entidad: trimmedPerson.entidad,
            correoElectronico: trimmedPerson.correoElectronico,
            id_country: trimmedPerson.id_country,
          },
        }
      }

      if (modalType === "author") {
        const nextAuthors = authors.map(updatePerson)
        if (recordType === "tesis") {
          const thesisRoleError = validateThesisAuthorsNotTutors(nextAuthors, tutors, {
            roleBeingAdded: "author",
          })
          if (thesisRoleError) {
            handleThesisRoleConflict(thesisRoleError)
            return
          }
        }
        setAuthors(nextAuthors)
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next.authors
          return next
        })
        showToast("Autor externo modificado con éxito", "success")
      } else {
        const nextTutors = tutors.map(updatePerson)
        if (recordType === "tesis") {
          const thesisRoleError = validateThesisAuthorsNotTutors(authors, nextTutors, {
            roleBeingAdded: "tutor",
          })
          if (thesisRoleError) {
            handleThesisRoleConflict(thesisRoleError)
            return
          }
        }
        setTutors(nextTutors)
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next.tutors
          return next
        })
        showToast("Tutor externo modificado con éxito", "success")
      }
    } else {
      const newPerson = {
        id: `external-${Date.now()}`,
        integrantId: null,
        usuario: {
          id: `external-${Date.now()}`,
          nombre: trimmedPerson.nombre,
          apellidos: trimmedPerson.apellidos,
          numeroIdentidad: trimmedPerson.numeroIdentidad,
          entidad: trimmedPerson.entidad,
          correoElectronico: trimmedPerson.correoElectronico,
          id_country: trimmedPerson.id_country,
          esExterno: true,
        },
        nombre: trimmedPerson.nombre,
        apellidos: trimmedPerson.apellidos,
        esExterno: true,
        esPrincipal: false,
        orden: 0,
      }
      if (modalType === "author") {
        const nextAuthors = [...authors, { ...newPerson, orden: authors.length + 1 }]
        if (recordType === "tesis") {
          const thesisRoleError = validateThesisAuthorsNotTutors(nextAuthors, tutors, {
            roleBeingAdded: "author",
          })
          if (thesisRoleError) {
            handleThesisRoleConflict(thesisRoleError)
            return
          }
        }
        setAuthors(nextAuthors)
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next.authors
          return next
        })
        showToast("Autor externo agregado con éxito", "success")
      } else {
        const nextTutors = [...tutors, { ...newPerson, orden: tutors.length + 1 }]
        if (recordType === "tesis") {
          const thesisRoleError = validateThesisAuthorsNotTutors(authors, nextTutors, {
            roleBeingAdded: "tutor",
          })
          if (thesisRoleError) {
            handleThesisRoleConflict(thesisRoleError)
            return
          }
        }
        setTutors(nextTutors)
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next.tutors
          return next
        })
        showToast("Tutor externo agregado con éxito", "success")
      }
    }

    resetExternalModal()
  }

  const handleRemoveAuthor = (authorId: string) => {
    const authorToRemove = authors.find((author) => author.id === authorId)
    
    // Prevenir que el usuario se elimine a sí mismo como autor
    const userId = currentUser?.id ? parseInt(currentUser.id) : null
    if (authorToRemove?.integrantId && userId && authorToRemove.integrantId === userId) {
      showToast("No puede eliminarse a sí mismo como autor del registro", "error")
      return
    }
    
    setAuthors((prev) => prev.filter((a) => a.id !== authorId))
    if (editingExternalId === authorId) {
      resetExternalModal()
    }
    if (authorToRemove?.integrantId) {
      setSelectedAuthorIds((prev) => prev.filter((value) => value !== authorToRemove.integrantId))
    }
  }

  const handleRemoveTutor = (tutorId: string) => {
    const tutorToRemove = tutors.find((tutor) => tutor.id === tutorId)
    setTutors(tutors.filter((t) => t.id !== tutorId))
    if (editingExternalId === tutorId) {
      resetExternalModal()
    }
    if (tutorToRemove?.integrantId) {
      setSelectedTutorIds((prev) => prev.filter((value) => value !== tutorToRemove.integrantId))
    }
  }

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup({ id: group.id_group, label: group.name })
    groupSearch.setTerm(group.name)
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject({ id: project.id_project, label: project.title })
    projectSearch.setTerm(project.title)
  }

  const handleClearGroup = () => {
    setSelectedGroup(null)
    groupSearch.setTerm("")
  }

  const handleClearProject = () => {
    setSelectedProject(null)
    projectSearch.setTerm("")
  }

  const buildAuthorIds = () => buildAuthorIdsFromAuthors(authors, selectedCountryId)

  // Función para validar todos los campos antes de enviar
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}

    // Validar campos requeridos comunes
    const tituloError = validateRequired(formData.titulo, "Título")
    if (tituloError) errors.titulo = tituloError

    const añoError = validateYear(formData.año)
    if (añoError) errors.año = añoError

    // Validar autores
    const authorsError = validateAuthors(authors)
    if (authorsError) errors.authors = authorsError

    // Validar palabras clave si están presentes
    if (formData.palabrasClave) {
      const keywordsError = validateKeywords(formData.palabrasClave)
      if (keywordsError) errors.palabrasClave = keywordsError
    }

    // Validaciones específicas por tipo de registro
    switch (recordType) {
      case "articulo": {
        const revistaError = validateRequired(formData.revista, "Revista")
        if (revistaError) errors.revista = revistaError
        const volumenError = validateRequired(formData.volumen, "Volumen")
        if (volumenError) errors.volumen = volumenError
        const paginasError = validateRequired(formData.paginas, "Páginas")
        if (paginasError) errors.paginas = paginasError
        if (formData.paginas?.includes("-")) {
          const [start, end] = formData.paginas.split("-")
          const pagesRangeError = validatePages(start.trim(), end.trim())
          if (pagesRangeError) errors.paginas = pagesRangeError
        }
        if (formData.issn) {
          const issnError = validateISSN(formData.issn)
          if (issnError) errors.issn = issnError
        }
        if (formData.doi && !isDoiLocked) {
          const doiError = validateDOINormalized(formData.doi)
          if (doiError) errors.doi = doiError
        }
        if (!selectedArticleTypeId) {
          errors.tipoArticulo = "Debe seleccionar un tipo de artículo"
        }
        break
      }
      case "libro": {
        const editorialError = validateRequired(formData.editorial, "Editorial")
        if (editorialError) errors.editorial = editorialError
        if (formData.isbn) {
          const isbnError = validateISBN(formData.isbn)
          if (isbnError) errors.isbn = isbnError
        }
        break
      }
      case "monografia":
        if (formData.isbn) {
          const isbnError = validateISBN(formData.isbn)
          if (isbnError) errors.isbn = isbnError
        }
        break
      case "norma":
        if (!selectedNormTypeId) {
          errors.tipoNorma = "Debe seleccionar un tipo de norma"
        }
        break
      case "tesis": {
        const thesisRoleError = validateThesisAuthorsNotTutors(authors, tutors)
        if (thesisRoleError) {
          errors.authors = thesisRoleError
          errors.tutors = thesisRoleError
        }
        break
      }
    }

    authors.forEach((author, index) => {
      if (!isExternalRecordAuthor(author)) return

      const emailError = validateEmailRequired(
        author.usuario?.correoElectronico,
        `Correo electrónico (autor externo ${index + 1})`,
      )
      if (emailError) {
        errors[`externalAuthorEmail_${index}`] = emailError
      }
      const { identityError } = validateIdentityField(
        author.usuario?.numeroIdentidad ?? "",
        author.usuario?.id_country ?? null,
        countries,
      )
      if (identityError) {
        errors[`externalAuthorIdentity_${index}`] = identityError
      }
    })

    tutors.forEach((tutor, index) => {
      if (!tutor.usuario?.esExterno) return
      const emailError = validateEmailRequired(
        tutor.usuario?.correoElectronico,
        `Correo electrónico (tutor externo ${index + 1})`,
      )
      if (emailError) {
        errors[`externalTutorEmail_${index}`] = emailError
      }
    })

    setFieldErrors(errors)
    return errors
  }

  const applyValidationErrors = (errors: Record<string, string>) => {
    setFieldErrors(errors)
    showToast(Object.values(errors).join(" · "), "error")
    scrollToFirstFormError(errors, {
      setActiveTab,
      recordType,
    })
  }

  const handleFinishRecordFlow = () => {
    setTimeout(() => {
      navigate("/records")
    }, pendingNavigation ? 0 : 1500)
  }

  const handleConfirmZenodoPublish = () => {
    setShowZenodoConfirm(false)
    setShowZenodoModal(true)
  }

  const handleSkipZenodoPublish = () => {
    setShowZenodoConfirm(false)
    setZenodoTarget(null)
    handleFinishRecordFlow()
  }

  const handleSaveCompleteRecord = async () => {
    const recordValidationErrors = validateForm()
    if (Object.keys(recordValidationErrors).length > 0) {
      applyValidationErrors(recordValidationErrors)
      return
    }

    try {
      setIsSubmitting(true)
      setFieldErrors({})

      const authorIds = buildAuthorIds()
      const payloadContext = buildPayloadContext(recordType, [], { includeDoi: true })

      let createdEntityId: number | null = null

      switch (recordType) {
        case "articulo": {
          const response = await recordService.createArticle({
            ...buildArticlePayload(payloadContext, "create"),
            author_ids: authorIds,
          })
          createdEntityId = extractEntityIdFromResponse("articulo", response.data as Record<string, unknown>)
          break
        }
        case "libro": {
          const response = await recordService.createBook({
            ...buildBookPayload(payloadContext),
            author_ids: authorIds,
          })
          createdEntityId = extractEntityIdFromResponse("libro", response.data as Record<string, unknown>)
          break
        }
        case "monografia": {
          const response = await recordService.createMonograph({
            ...buildMonographPayload(payloadContext),
            author_ids: authorIds,
          })
          createdEntityId = extractEntityIdFromResponse("monografia", response.data as Record<string, unknown>)
          break
        }
        case "norma": {
          const response = await recordService.createNorm({
            ...buildNormPayload(payloadContext),
            author_ids: authorIds,
          })
          createdEntityId = extractEntityIdFromResponse("norma", response.data as Record<string, unknown>)
          break
        }
        case "patente": {
          const response = await recordService.createPatent({
            ...buildPatentPayload(payloadContext),
            author_ids: authorIds,
          })
          createdEntityId = extractEntityIdFromResponse("patente", response.data as Record<string, unknown>)
          break
        }
        case "software": {
          const response = await recordService.createSoftware({
            ...buildSoftwarePayload(payloadContext),
            author_ids: authorIds,
          })
          createdEntityId = extractEntityIdFromResponse("software", response.data as Record<string, unknown>)
          break
        }
        case "evento": {
          const response = await recordService.createEvent({
            ...buildEventPayload(payloadContext),
            author_ids: authorIds,
          })
          createdEntityId = extractEntityIdFromResponse("evento", response.data as Record<string, unknown>)
          break
        }
        case "premio": {
          const response = await recordService.createPrize({
            ...buildPrizePayload(payloadContext),
            author_ids: authorIds,
          })
          createdEntityId = extractEntityIdFromResponse("premio", response.data as Record<string, unknown>)
          break
        }
        case "tesis": {
          const response = await recordService.createThesis({
            ...buildThesisPayload(payloadContext),
            author_ids: authorIds,
          })
          createdEntityId = extractEntityIdFromResponse("tesis", response.data as Record<string, unknown>)
          break
        }
        default:
          throw new Error("Tipo de registro no válido")
      }

      showToast("Registro científico guardado con éxito", "success")

      if (
        canPublishToZenodo() &&
        createdEntityId !== null &&
        canPublishRecordToZenodo(recordType, formData.doi, false)
      ) {
        setZenodoTarget({
          entityType: mapRecordTypeToEntityType(recordType),
          entityId: createdEntityId,
          recordType,
          title: formData.titulo,
        })
        setShowZenodoConfirm(true)
        return
      }

      handleFinishRecordFlow()
    } catch (error: unknown) {
      if (isDuplicateIdentifierError(error)) {
        const friendlyMessage = getDuplicateIdentifierMessage(error)
        showToast(friendlyMessage, "error")
        scrollToDuplicateFieldError(friendlyMessage)
      } else {
        const errorMessage = extractErrorMessage(error) || "Error al guardar el registro"
        showToast(errorMessage, "error")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToDuplicateFieldError = (message: string) => {
    const lower = message.toLowerCase()
    if (lower.includes("doi")) {
      scrollToFormError({ fieldKey: "doi", setActiveTab, recordType })
      return
    }
    if (lower.includes("issn")) {
      scrollToFormError({ fieldKey: "issn", setActiveTab, recordType })
      return
    }
    if (lower.includes("isbn")) {
      scrollToFormError({ fieldKey: "isbn", setActiveTab, recordType })
      return
    }
    scrollToFormError({ fieldKey: "titulo", setActiveTab, recordType })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.target.name === "doi" && isDoiLocked) {
      return
    }
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const recordEditSnapshot = useMemo(
    () => ({
      recordType: effectiveRecordType,
      formData,
      selectedCountryId,
      selectedArticleTypeId,
      selectedNormTypeId,
      selectedPrizeTypeId,
      selectedThesisTypeId,
      selectedEncounterTypeId,
      id_group: selectedGroup?.id ?? null,
      id_project: selectedProject?.id ?? null,
      selectedAuthorIds: [...selectedAuthorIds].sort((a, b) => a - b),
      selectedTutorIds: [...selectedTutorIds].sort((a, b) => a - b),
      authors: authors.map((author, index) => ({
        integrantId: author.integrantId ?? null,
        nombre: author.nombre ?? author.usuario?.nombre ?? "",
        apellidos: author.apellidos ?? author.usuario?.apellidos ?? "",
        esPrincipal: author.esPrincipal ?? false,
        orden: author.orden ?? index + 1,
        esExterno: author.esExterno ?? author.usuario?.esExterno ?? false,
        correo: author.usuario?.correoElectronico ?? "",
        entidad: author.usuario?.lugarTrabajo ?? author.usuario?.entidad ?? "",
      })),
      tutors: tutors.map((tutor, index) => ({
        integrantId: tutor.integrantId ?? null,
        nombre: tutor.nombre ?? tutor.usuario?.nombre ?? "",
        apellidos: tutor.apellidos ?? tutor.usuario?.apellidos ?? "",
        orden: tutor.orden ?? index + 1,
      })),
    }),
    [
      effectiveRecordType,
      formData,
      selectedCountryId,
      selectedArticleTypeId,
      selectedNormTypeId,
      selectedPrizeTypeId,
      selectedThesisTypeId,
      selectedEncounterTypeId,
      selectedGroup,
      selectedProject,
      selectedAuthorIds,
      selectedTutorIds,
      authors,
      tutors,
    ],
  )

  const isRecordEditDirty = useEditFormDirty(
    Boolean(isEditMode && recordEditBaselineReady),
    recordEditSnapshot,
  )

  const handleUpdateRecord = async () => {
    if (!isRecordEditDirty) {
      showToast("No hay cambios para guardar", "info")
      return
    }

    const effectiveRecordTypeForUpdate = effectiveRecordType

    if (!recordNumericId) {
      showToast("No se pudo identificar el registro a actualizar.", "error")
      return
    }

    if (!isRecordTypeValue(effectiveRecordTypeForUpdate)) {
      showToast("No se pudo determinar el tipo de registro para actualizar.", "error")
      return
    }

    const recordValidationErrors = validateForm()
    if (Object.keys(recordValidationErrors).length > 0) {
      applyValidationErrors(recordValidationErrors)
      return
    }

    const entityId = Number(recordNumericId)
    if (Number.isNaN(entityId)) {
      showToast("El identificador del registro no es válido.", "error")
      scrollToFormError({ fieldKey: "titulo", setActiveTab, recordType })
      return
    }

    try {
      setIsSubmitting(true)
      setFieldErrors({})

      const authorIdsForUpdate =
        effectiveRecordTypeForUpdate === "articulo"
          ? await resolveArticleAuthorIdsForUpdate(authors)
          : getAuthorIdsForUpdate()
      const payloadContext = buildPayloadContext(effectiveRecordTypeForUpdate, authorIdsForUpdate)

      switch (effectiveRecordTypeForUpdate) {
        case "articulo":
          await recordService.updateArticle(
            entityId,
            buildArticlePayload(payloadContext, "update"),
          )
          break
        case "libro":
          await recordService.updateBook(entityId, buildBookPayload(payloadContext))
          break
        case "monografia":
          await recordService.updateMonograph(entityId, buildMonographPayload(payloadContext))
          break
        case "norma":
          await recordService.updateNorm(entityId, buildNormPayload(payloadContext))
          break
        case "patente":
          await recordService.updatePatent(entityId, buildPatentPayload(payloadContext))
          break
        case "software":
          await recordService.updateSoftware(entityId, buildSoftwarePayload(payloadContext))
          break
        case "evento":
          await recordService.updateEvent(entityId, buildEventPayload(payloadContext))
          break
        case "premio":
          await recordService.updatePrize(entityId, buildPrizePayload(payloadContext))
          break
        case "tesis":
          await recordService.updateThesis(entityId, buildThesisPayload(payloadContext))
          break
        default:
          throw new Error("Tipo de registro no válido")
      }

      showToast("Registro actualizado con éxito", "success")
      setTimeout(() => {
        navigate("/records")
      }, 1500)
    } catch (error: unknown) {
      if (isDuplicateIdentifierError(error)) {
        const friendlyMessage = getDuplicateIdentifierMessage(error)
        showToast(friendlyMessage, "error")
        scrollToDuplicateFieldError(friendlyMessage)
        return
      }
      const errorMessage = extractErrorMessage(error) || "Error al actualizar el registro"
      showToast(errorMessage, "error")
      scrollToFormError({ fieldKey: "titulo", setActiveTab, recordType })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderTypeSpecificFields = () => {
    switch (recordType) {
      case "articulo":
        return (
          <>
            <div className="form-group">
              <label htmlFor="revista">
                Revista <span className="required">*</span>
              </label>
              <Input
                id="revista"
                name="revista"
                type="text"
                value={formData.revista}
                onChange={handleChange}
                placeholder="Nombre de la revista"
                required
                disabled={isViewMode ? true : false}
                error={fieldErrors.revista}
              />
            </div>
            <div className="form-group">
              <label htmlFor="tipoArticulo">Tipo de Artículo</label>
              {isViewMode ? (
                <Input
                  id="tipoArticulo"
                  name="tipoArticulo"
                  type="text"
                  value={formData.tipoArticulo}
                  onChange={handleChange}
                  disabled={true}
                />
              ) : (
                <select
                  id="tipoArticulo"
                  name="tipoArticulo"
                  value={selectedArticleTypeId ?? ""}
                  onChange={(event) => handleArticleTypeChange(event.target.value)}
                  className="form-select"
                  aria-label="Tipo de artículo"
                >
                  <option value="">Seleccione tipo</option>
                  {articleTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              )}
              {fieldErrors.tipoArticulo && (
                <span className="field-error">{fieldErrors.tipoArticulo}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="issn">ISSN</label>
              <Input
                id="issn"
                name="issn"
                type="text"
                value={formData.issn}
                onChange={handleChange}
                placeholder="0000-0000"
                disabled={isViewMode ? true : false}
                error={fieldErrors.issn}
              />
            </div>
            <div className="form-group">
              <label htmlFor="volumen">Volumen</label>
              <Input
                id="volumen"
                name="volumen"
                type="text"
                value={formData.volumen}
                onChange={handleChange}
                disabled={isViewMode ? true : false}
                error={fieldErrors.volumen}
              />
            </div>
            <div className="form-group">
              <label htmlFor="numero">Número</label>
              <Input
                id="numero"
                name="numero"
                type="text"
                value={formData.numero}
                onChange={handleChange}
                disabled={isViewMode ? true : false}
              />
            </div>
            <div className="form-group">
              <label htmlFor="paginas">Páginas</label>
              <Input
                id="paginas"
                name="paginas"
                type="text"
                value={formData.paginas}
                onChange={handleChange}
                placeholder="Ej: 123-145"
                disabled={isViewMode ? true : false}
                error={fieldErrors.paginas}
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="doi">DOI</label>
              <Input
                id="doi"
                name="doi"
                type="text"
                value={formData.doi}
                onChange={handleChange}
                placeholder="10.1000/xyz123"
                disabled={isViewMode || isDoiLocked}
                readOnly={isDoiLocked}
                aria-describedby="doi-hint"
                aria-readonly={isDoiLocked}
                error={fieldErrors.doi}
              />
              <small id="doi-hint" className="form-hint">
                {isZenodoPublished
                  ? "Este registro fue publicado en Zenodo. El DOI asignado no puede modificarse."
                  : hasPersistedArticleDoi
                    ? "Este artículo ya tiene un DOI asignado (publicación externa). No puede modificarse ni publicarse en Zenodo."
                    : "Complételo solo si la publicación es de acceso público. Si indica un DOI, no podrá publicarse en Zenodo. Al publicar en Zenodo, el DOI se guardará aquí automáticamente."}
              </small>
            </div>
          </>
        )
      case "libro":
        return (
          <>
            <div className="form-group full-width">
              <label htmlFor="tituloCapitulo">Título del capítulo</label>
              <Input
                id="tituloCapitulo"
                name="tituloCapitulo"
                type="text"
                value={formData.tituloCapitulo}
                onChange={handleChange}
                placeholder="Título del capítulo (si aplica)"
                disabled={isViewMode ? true : false}
              />
            </div>
            <div className="form-group">
              <label htmlFor="editorial">
                Editorial <span className="required">*</span>
              </label>
              <Input
                id="editorial"
                name="editorial"
                type="text"
                value={formData.editorial}
                onChange={handleChange}
                required
                disabled={isViewMode ? true : false}
              />
              {fieldErrors.editorial && (
                <span className="field-error">{fieldErrors.editorial}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="isbn">ISBN</label>
              <Input
                id="isbn"
                name="isbn"
                type="text"
                value={formData.isbn}
                onChange={handleChange}
                disabled={isViewMode ? true : false}
              />
              {fieldErrors.isbn && <span className="field-error">{fieldErrors.isbn}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="paginas">Páginas</label>
              <Input
                id="paginas"
                name="paginas"
                type="text"
                value={formData.paginas}
                onChange={handleChange}
                disabled={isViewMode ? true : false}
              />
            </div>
          </>
        )
      case "monografia":
        return (
          <>
            <div className="form-group">
              <label htmlFor="editorial">
                Editorial <span className="required">*</span>
              </label>
              <Input
                id="editorial"
                name="editorial"
                type="text"
                value={formData.editorial}
                onChange={handleChange}
                required
                disabled={isViewMode ? true : false}
              />
            </div>
            <div className="form-group">
              <label htmlFor="isbn">ISBN</label>
              <Input
                id="isbn"
                name="isbn"
                type="text"
                value={formData.isbn}
                onChange={handleChange}
                disabled={isViewMode ? true : false}
              />
              {fieldErrors.isbn && <span className="field-error">{fieldErrors.isbn}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="paginas">Páginas</label>
              <Input
                id="paginas"
                name="paginas"
                type="text"
                value={formData.paginas}
                onChange={handleChange}
                disabled={isViewMode ? true : false}
              />
            </div>
          </>
        )
      case "norma":
        return (
          <>
            <div className="form-group">
              <label htmlFor="numeroRegistro">
                Número de Registro <span className="required">*</span>
              </label>
              <Input
                id="numeroRegistro"
                name="numeroRegistro"
                type="text"
                value={formData.numeroRegistro}
                onChange={handleChange}
                required
                disabled={isViewMode}
              />
            </div>
            <div className="form-group">
              <label htmlFor="paginas">Páginas</label>
              <Input
                id="paginas"
                name="paginas"
                type="text"
                value={formData.paginas}
                onChange={handleChange}
                disabled={isViewMode}
              />
            </div>
            <div className="form-group">
              <label htmlFor="tipoNorma">Tipo de Norma</label>
              {isViewMode ? (
                <Input
                  id="tipoNorma"
                  name="tipoNorma"
                  type="text"
                  value={formData.tipoNorma}
                  onChange={handleChange}
                  disabled={true}
                />
              ) : (
                <select
                  id="tipoNorma"
                  name="tipoNorma"
                  value={selectedNormTypeId ?? ""}
                  onChange={(event) => handleNormTypeChange(event.target.value)}
                  className="form-select"
                  aria-label="Tipo de norma"
                >
                  <option value="">Seleccione tipo</option>
                  {normTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              )}
              {fieldErrors.tipoNorma && (
                <span className="field-error">{fieldErrors.tipoNorma}</span>
              )}
            </div>
          </>
        )
      case "tesis":
        return (
          <div className="form-group">
            <label htmlFor="tipoTesis">
              Tipo de Tesis <span className="required">*</span>
            </label>
            {isViewMode ? (
              <Input
                id="tipoTesis"
                name="tipoTesis"
                type="text"
                value={formData.tipoTesis}
                onChange={handleChange}
                disabled={true}
              />
            ) : (
            <select
              id="tipoTesis"
              name="tipoTesis"
              value={selectedThesisTypeId ?? ""}
              onChange={(event) => handleThesisTypeChange(event.target.value)}
              required
              className="form-select"
            >
              <option value="">Seleccione tipo</option>
              {thesisTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            )}
          </div>
        )
      case "patente":
        return (
          <>
            <div className="form-group">
              <label htmlFor="numeroRegistro">Número de Registro</label>
              <Input
                id="numeroRegistro"
                name="numeroRegistro"
                type="text"
                value={formData.numeroRegistro}
                onChange={handleChange}
                disabled={isViewMode ? true : false}
              />
            </div>
            <div className="form-group">
              <label htmlFor="estado">Estado</label>
              {isViewMode ? (
                <Input
                  id="estado"
                  name="estado"
                  type="text"
                  value={formData.estado}
                  onChange={handleChange}
                  disabled={true}
                />
              ) : (
                <select
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="form-select"
                >
                <option value="">Seleccione estado</option>
                <option value="tramite">En trámite</option>
                <option value="concedida">Concedida</option>
              </select>
              )}
            </div>
          </>
        )
      case "software":
        return (
          <>
            <div className="form-group">
              <label htmlFor="registroCENDA">Registro CENDA</label>
              <Input
                id="registroCENDA"
                name="registroCENDA"
                type="text"
                value={formData.registroCENDA}
                onChange={handleChange}
                disabled={isViewMode ? true : false}
              />
            </div>
            <div className="form-group">
              <label htmlFor="estado">Estado</label>
              {isViewMode ? (
                <Input
                  id="estado"
                  name="estado"
                  type="text"
                  value={formData.estado}
                  onChange={handleChange}
                  disabled={true}
                />
              ) : (
                <select
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="form-select"
                >
                <option value="">Seleccione estado</option>
                <option value="desarrollo">En desarrollo</option>
                <option value="terminado">Terminado</option>
                <option value="registrado">Registrado</option>
              </select>
              )}
            </div>
          </>
        )
      case "evento":
        return (
          <>
            <div className="form-group">
              <label htmlFor="nombreEvento">
                Nombre del Evento <span className="required">*</span>
              </label>
              <Input
                id="nombreEvento"
                name="nombreEvento"
                type="text"
                value={formData.nombreEvento}
                onChange={handleChange}
                required
                disabled={isViewMode ? true : false}
              />
            </div>
            <div className="form-group">
              <label htmlFor="organizador">Organizador</label>
              <Input
                id="organizador"
                name="organizador"
                type="text"
                value={formData.organizador}
                onChange={handleChange}
                disabled={isViewMode ? true : false}
              />
            </div>
            <div className="form-group">
              <label htmlFor="tipoEvento">Tipo de Evento</label>
              {isViewMode ? (
                <Input
                  id="tipoEvento"
                  name="tipoEvento"
                  type="text"
                  value={formData.tipoEvento}
                  onChange={handleChange}
                  disabled
                />
              ) : (
                <select
                  id="tipoEvento"
                  name="tipoEvento"
                  value={selectedEncounterTypeId ?? ""}
                  onChange={(event) => handleEncounterTypeChange(event.target.value)}
                  className="form-select"
                >
                  <option value="">Seleccione tipo</option>
                  {encounterTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )
      case "premio":
        return (
          <>
            <div className="form-group">
              <label htmlFor="tipoPremio">Tipo de Premio</label>
              {isViewMode ? (
                <Input
                  id="tipoPremio"
                  name="tipoPremio"
                  type="text"
                  value={formData.tipoPremio}
                  onChange={handleChange}
                  disabled
                />
              ) : (
                <select
                  id="tipoPremio"
                  name="tipoPremio"
                  value={selectedPrizeTypeId ?? ""}
                  onChange={(event) => handlePrizeTypeChange(event.target.value)}
                  className="form-select"
                >
                  <option value="">Seleccione tipo</option>
                  {prizeTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="institucion">Institución que Otorga</label>
              <Input
                id="institucion"
                name="institucion"
                type="text"
                value={formData.institucion}
                onChange={handleChange}
                disabled={isViewMode ? true : false}
              />
            </div>
          </>
        )
      default:
        return null
    }
  }

  const tabs = [
    { id: "datos-basicos", label: "Datos Básicos" },
    { id: "autores", label: "Autores" },
    ...(recordType === "tesis" ? [{ id: "tutores", label: "Tutores" }] : []),
  ]

  if (isMetadataLoading) {
    return (
      <div className="form-page record-form">
        <Card>
          <p>Cargando catálogos iniciales...</p>
        </Card>
      </div>
    )
  }

  if (metadataError) {
    return (
      <div className="form-page record-form">
        <Card>
          <p className="error-message">{metadataError}</p>
          <div className="form-actions">
            <Button type="button" onClick={() => setMetadataReloadKey((prev) => prev + 1)}>
              Reintentar carga
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="form-page record-form">
      <Modal
        isOpen={showExternalModal}
        onClose={resetExternalModal}
        title={`${editingExternalId ? "Modificar" : "Agregar"} ${
          modalType === "author" ? "Autor" : "Tutor"
        } Externo`}
      >
        <form onSubmit={handleSubmitExternal} className="modal-form">
          <div className="form-group">
            <label>Nombre *</label>
            <Input
              value={externalPerson.nombre}
              onChange={(e) => setExternalPerson({ ...externalPerson, nombre: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Apellidos *</label>
            <Input
              value={externalPerson.apellidos}
              onChange={(e) => setExternalPerson({ ...externalPerson, apellidos: e.target.value })}
              required
            />
          </div>
          <IdentityDocumentField
            countries={countries}
            countryId={externalPerson.id_country}
            onCountryIdChange={(id_country) =>
              setExternalPerson({ ...externalPerson, id_country })
            }
            identity={externalPerson.numeroIdentidad}
            onIdentityChange={(numeroIdentidad) =>
              setExternalPerson({ ...externalPerson, numeroIdentidad })
            }
            onClearErrors={() => {
              setExternalPersonCountryError(null)
              setExternalPersonIdentityError(null)
            }}
            countryError={externalPersonCountryError}
            identityError={externalPersonIdentityError}
          />
          <div className="form-group">
            <label>Entidad a la que pertenece *</label>
            <Input
              value={externalPerson.entidad}
              onChange={(e) => setExternalPerson({ ...externalPerson, entidad: e.target.value })}
              placeholder="Ej: Universidad de La Habana"
              required
            />
          </div>
          <div className="form-group">
            <Input
              label="Correo electrónico *"
              type="email"
              value={externalPerson.email}
              onChange={(e) => {
                setExternalPersonEmailError(null)
                setExternalPerson({ ...externalPerson, email: e.target.value })
              }}
              placeholder="ejemplo@universidad.edu"
              error={externalPersonEmailError ?? undefined}
              autoComplete="email"
            />
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={resetExternalModal}>
              Cancelar
            </Button>
            <Button type="submit">{editingExternalId ? "Guardar" : "Agregar"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showZenodoConfirm}
        title="Publicar en Zenodo"
        message="El registro se guardó correctamente. ¿Desea publicarlo ahora en Zenodo? Deberá adjuntar un archivo PDF."
        confirmText="Sí, publicar"
        cancelText="No, más tarde"
        onConfirm={handleConfirmZenodoPublish}
        onCancel={handleSkipZenodoPublish}
      />

      <ZenodoPublishModal
        isOpen={showZenodoModal}
        target={zenodoTarget}
        onClose={() => {
          setShowZenodoModal(false)
          setZenodoTarget(null)
          handleFinishRecordFlow()
        }}
        onPublished={(_url, publication) => {
          if (publication?.status === "published") {
            setIsZenodoPublished(true)
          }
          const publishedDoi = normalizeDoiValue(publication?.doi)
          if (publishedDoi && recordType === "articulo") {
            setFormData((prev) => ({ ...prev, doi: publishedDoi }))
          }
          setPendingNavigation(true)
        }}
      />

      {(isViewMode || isEditMode) && recordLoading && (
        <Card>
          <p>Cargando datos del registro seleccionado...</p>
        </Card>
      )}

      {recordLoadError && (
        <Card>
          <p className="error-message">{recordLoadError}</p>
        </Card>
      )}

      <div className="page-toolbar form-page__toolbar" id="record-form-top">
        <p className="page-toolbar__lead">Complete la información del registro científico</p>
      </div>

      <div className="record-type-menu">
        {recordTypes.map((type) => (
          <button
            key={type.value}
            type="button"
            className={`type-menu-item ${recordType === type.value ? "selected" : ""}`}
            onClick={() => !isViewMode && !isSaved && !isEditMode && setRecordType(type.value)}
            disabled={isViewMode || isSaved || isEditMode}
          >
            {type.label}
          </button>
        ))}
      </div>
      {isEditMode && (
        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', textAlign: 'center' }}>
          El tipo de registro no puede ser modificado
        </p>
      )}

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
          {((!isSaved && !isViewMode && !isEditMode) || activeTab === "datos-basicos") && (
            <>
              <div className="form-section">
                <h3>Información General</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="titulo">
                      Título <span className="required">*</span>
                    </label>
                    <Input
                      id="titulo"
                      name="titulo"
                      type="text"
                      value={formData.titulo}
                      onChange={handleChange}
                      placeholder="Título del registro"
                      required
                      disabled={isViewMode ? true : false}
                    />
                    {fieldErrors.titulo && <span className="field-error">{fieldErrors.titulo}</span>}
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="resumen">Resumen</label>
                    <textarea
                      id="resumen"
                      name="resumen"
                      value={formData.resumen}
                      onChange={handleChange}
                      placeholder="Resumen del trabajo"
                      rows={4}
                      className="form-textarea"
                      disabled={isViewMode ? true : false}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="año">
                      Año <span className="required">*</span>
                    </label>
                    <Input
                      id="año"
                      name="año"
                      type="number"
                      value={formData.año}
                      onChange={handleChange}
                      min="1900"
                      max="2100"
                      required
                      disabled={isViewMode ? true : false}
                    />
                    {fieldErrors.año && <span className="field-error">{fieldErrors.año}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="mes">Mes</label>
                    {isViewMode ? (
                      <Input
                        id="mes"
                        name="mes"
                        type="text"
                        value={formData.mes}
                        onChange={handleChange}
                        disabled={true}
                      />
                    ) : (
                    <select id="mes" name="mes" value={formData.mes} onChange={handleChange} className="form-select">
                      <option value="1">Enero</option>
                      <option value="2">Febrero</option>
                      <option value="3">Marzo</option>
                      <option value="4">Abril</option>
                      <option value="5">Mayo</option>
                      <option value="6">Junio</option>
                      <option value="7">Julio</option>
                      <option value="8">Agosto</option>
                      <option value="9">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="pais">País</label>
                    {isViewMode ? (
                      <Input id="pais" name="pais" type="text" value={formData.pais} onChange={handleChange} disabled />
                    ) : (
                      <select
                        id="pais"
                        name="pais"
                        value={selectedCountryId ?? ""}
                        onChange={(event) => handleCountryChange(event.target.value)}
                        className="form-select"
                        disabled={countries.length === 0}
                      >
                        <option value="">Seleccione un país</option>
                        {countries.map((country) => (
                          <option key={country.id_country} value={country.id_country}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Detalles Específicos</h3>
                <div className="form-grid">{renderTypeSpecificFields()}</div>
              </div>

              <div className="form-section">
                <h3>Información Adicional</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="palabrasClave">Palabras Clave</label>
                    <Input
                      id="palabrasClave"
                      name="palabrasClave"
                      type="text"
                      value={formData.palabrasClave}
                      onChange={handleChange}
                      placeholder="Separe las palabras clave con comas"
                      disabled={isViewMode ? true : false}
                    />
                    <small className="form-hint">Separe múltiples palabras clave con comas (mínimo 3, máximo 10)</small>
                    {fieldErrors.palabrasClave && <span className="field-error">{fieldErrors.palabrasClave}</span>}
                  </div>
                </div>
              </div>

              <GroupProjectAssignFields
                selectedGroup={selectedGroup}
                selectedProject={selectedProject}
                groupSearchTerm={groupSearch.term}
                projectSearchTerm={projectSearch.term}
                onGroupSearchTermChange={(value) => {
                  if (selectedGroup) setSelectedGroup(null)
                  groupSearch.setTerm(value)
                }}
                onProjectSearchTermChange={(value) => {
                  if (selectedProject) setSelectedProject(null)
                  projectSearch.setTerm(value)
                }}
                groupResults={groupSearch.results}
                projectResults={projectSearch.results}
                groupLoading={groupSearch.isLoading}
                projectLoading={projectSearch.isLoading}
                groupError={groupSearch.error}
                projectError={projectSearch.error}
                onSelectGroup={handleSelectGroup}
                onSelectProject={handleSelectProject}
                onClearGroup={handleClearGroup}
                onClearProject={handleClearProject}
                disabled={isViewMode}
              />

              {!isSaved && !isViewMode && !isEditMode && (
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => navigate("/records")}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar Datos Básicos</Button>
                </div>
              )}
            </>
          )}

          {(isSaved || isViewMode || isEditMode) && activeTab === "autores" && (
            <div className="form-section" id="authors-section" data-field-key="authors">
              <div className="tab-header">
                <h3>Autores del Registro</h3>
                {!isViewMode && (
                  <div className="tab-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label="Agregar autor externo"
                      onClick={() => openCreateExternalModal("author")}
                    >
                      Registrar Autor Externo
                    </Button>
                  </div>
                )}
              </div>

              {!isViewMode && (
                <div className="form-group full-width">
                  <label htmlFor="authorSearch">Buscar integrante CUJAE</label>
                  <Input
                    id="authorSearch"
                    name="authorSearch"
                    type="text"
                    value={authorSearch.term}
                    onChange={(event) => authorSearch.setTerm(event.target.value)}
                    placeholder="Escribe un nombre, correo o centro de trabajo"
                    aria-label="Campo para buscar integrantes"
                  />
                  <small className="form-hint">
                    Filtramos automáticamente contra el directorio en línea y puedes seleccionar los resultados.
                  </small>
                </div>
              )}

              {!isViewMode && (
                <div className="record-list">
                  {authorSearch.isLoading ? (
                    <p className="empty-state">Buscando integrantes...</p>
                  ) : authorSearch.error ? (
                    <p className="error-message">{authorSearch.error}</p>
                  ) : authorSearch.results.length === 0 ? (
                    <p className="empty-state">Escribe al menos 2 caracteres para obtener coincidencias</p>
                  ) : (
                    authorSearch.results.map((integrant) => (
                      <div key={integrant.id_integrant} className="record-item">
                        <div className="record-item-info">
                          <strong>{integrant.name}</strong>
                          <span>{integrant.email || "Sin correo"}</span>
                          <span>{integrant.work_center || "Sin centro de trabajo"}</span>
                        </div>
                        <Button
                          size="sm"
                          aria-label={`Agregar ${integrant.name} como autor`}
                          onClick={() => handleSelectIntegrant(integrant, "author")}
                        >
                          Agregar
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {fieldErrors.authors && (
                <p className="field-error" role="alert">
                  {fieldErrors.authors}
                </p>
              )}
              {authors.length === 0 ? (
                <p className="empty-state">No hay autores agregados aún</p>
              ) : (
                <div className="members-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Apellidos</th>
                        <th>Carnet</th>
                        <th>Entidad</th>
                        <th>Correo</th>
                        <th>Tipo</th>
                        {!isViewMode && <th>Opciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {authors.map((author) => {
                        const isExternal = isExternalRecordAuthor(author)
                        const userId = currentUser?.id ? parseInt(currentUser.id) : null
                        const isCurrentUser =
                          author.integrantId && userId && author.integrantId === userId

                        return (
                          <tr key={author.id}>
                            <td>{author.nombre}</td>
                            <td>{author.apellidos}</td>
                            <td>{author.usuario?.numeroIdentidad || "—"}</td>
                            <td>{author.usuario?.entidad || "—"}</td>
                            <td>{author.usuario?.correoElectronico || "—"}</td>
                            <td>{isExternal ? "Externo" : "CUJAE"}</td>
                            {!isViewMode && (
                              <td className="member-actions-cell">
                                <OptionsMenu
                                  options={[
                                    ...(isExternal
                                      ? [
                                          {
                                            label: "Modificar",
                                            onClick: () => openEditExternalModal("author", author),
                                          },
                                        ]
                                      : []),
                                    {
                                      label: "Eliminar",
                                      onClick: () => handleRemoveAuthor(author.id),
                                      className: isCurrentUser ? "disabled" : "",
                                    },
                                  ]}
                                />
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

          {(isSaved || isViewMode || isEditMode) && activeTab === "tutores" && recordType === "tesis" && (
            <div className="form-section" id="tutores-section" data-field-key="tutors">
              <div className="tab-header">
                <h3>Tutores de la Tesis</h3>
                {!isViewMode && (
                  <div className="tab-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label="Agregar tutor externo"
                      onClick={() => openCreateExternalModal("tutor")}
                    >
                      Registrar Tutor Externo
                    </Button>
                  </div>
                )}
              </div>

              {!isViewMode && (
                <div className="form-group full-width">
                  <label htmlFor="tutorSearch">Buscar integrante tutor</label>
                  <Input
                    id="tutorSearch"
                    name="tutorSearch"
                    type="text"
                    value={tutorSearch.term}
                    onChange={(event) => tutorSearch.setTerm(event.target.value)}
                    placeholder="Escribe para buscar potenciales tutores"
                    aria-label="Campo para buscar tutores"
                  />
                  <small className="form-hint">Agrega tutores oficiales desde el directorio institucional.</small>
                </div>
              )}

              {!isViewMode && (
                <div className="record-list">
                  {tutorSearch.isLoading ? (
                    <p className="empty-state">Buscando tutores...</p>
                  ) : tutorSearch.error ? (
                    <p className="error-message">{tutorSearch.error}</p>
                  ) : tutorSearch.results.length === 0 ? (
                    <p className="empty-state">Escribe al menos 2 caracteres para listar tutores</p>
                  ) : (
                    tutorSearch.results.map((integrant) => (
                      <div key={integrant.id_integrant} className="record-item">
                        <div className="record-item-info">
                          <strong>{integrant.name}</strong>
                          <span>{integrant.email || "Sin correo"}</span>
                          <span>{integrant.work_center || "Sin centro de trabajo"}</span>
                        </div>
                        <Button
                          size="sm"
                          aria-label={`Agregar ${integrant.name} como tutor`}
                          onClick={() => handleSelectIntegrant(integrant, "tutor")}
                        >
                          Agregar
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {fieldErrors.tutors && (
                <p className="field-error" role="alert">
                  {fieldErrors.tutors}
                </p>
              )}

              {tutors.length === 0 ? (
                <p className="empty-state">No hay tutores agregados aún</p>
              ) : (
                <div className="members-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Apellidos</th>
                        <th>Carnet</th>
                        <th>Entidad</th>
                        <th>Correo</th>
                        <th>Tipo</th>
                        {!isViewMode && <th>Opciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {tutors.map((tutor) => {
                        const isExternal = tutor.usuario?.esExterno === true

                        return (
                          <tr key={tutor.id}>
                            <td>{tutor.nombre}</td>
                            <td>{tutor.apellidos}</td>
                            <td>{tutor.usuario?.numeroIdentidad || "—"}</td>
                            <td>{tutor.usuario?.entidad || "—"}</td>
                            <td>{tutor.usuario?.correoElectronico || "—"}</td>
                            <td>{isExternal ? "Externo" : "CUJAE"}</td>
                            {!isViewMode && (
                              <td className="member-actions-cell">
                                <OptionsMenu
                                  options={[
                                    ...(isExternal
                                      ? [
                                          {
                                            label: "Modificar",
                                            onClick: () => openEditExternalModal("tutor", tutor),
                                          },
                                        ]
                                      : []),
                                    {
                                      label: "Eliminar",
                                      onClick: () => handleRemoveTutor(tutor.id),
                                    },
                                  ]}
                                />
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

        </form>
      </Card>

      {isSaved && !isViewMode && !isEditMode && (
        <Card>
          <div className="form-actions">
            <Button type="button" onClick={handleSaveCompleteRecord} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Registro Completo"}
            </Button>
          </div>
        </Card>
      )}

      {isEditMode && (
        <Card>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => navigate("/records")}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleUpdateRecord()}
              disabled={isSubmitting || !isRecordEditDirty}
              title={!isRecordEditDirty ? "No hay cambios para guardar" : undefined}
            >
              {isSubmitting ? "Actualizando..." : "Actualizar Registro"}
            </Button>
          </div>
        </Card>
      )}

      {isViewMode && (
        <Card>
          <div className="form-actions">
            <Button type="button" onClick={() => navigate("/records")}>
              Volver a Registros
            </Button>
            {isAdmin && (
              <Button
                type="button"
                onClick={() =>
                  navigate(`/records/${id}/edit`, {
                    state: recordData ? { record: recordData } : undefined,
                  })
                }
              >
                Editar Registro
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
