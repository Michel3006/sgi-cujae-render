"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { IAuditLog, IUser } from "../types"
import {
  traceService,
  TRACE_PAGE_SIZE,
  mapTipoAccionToHttpMethod,
  type Trace,
  type TraceFilters,
} from "../services/traceService"
import { integrantService } from "../services/integrantService"
import type { IntegrantWithRoles } from "../types/api/integrant"
import { Card } from "../components/common/Card"
import { Input } from "../components/common/Input"
import { Button } from "../components/common/Button"
import { Table } from "../components/common/Table"
import { Loader2 } from "lucide-react"
import { useToast } from "../contexts/ToastContext"
import "./AuditLog.css"

const mapIntegrantToIUser = (integrant: IntegrantWithRoles): IUser => {
  const nameParts = integrant.name.split(" ")
  const nombre = nameParts[0] || ""
  const apellidos = nameParts.slice(1).join(" ") || ""

  return {
    id: integrant.id_integrant.toString(),
    nombre,
    apellidos,
    numeroIdentidad: integrant.identity || "",
    correoElectronico: integrant.email || "",
    nombreUsuario: integrant.email?.split("@")[0] || "",
    roles:
      integrant.roles?.map((r) => {
        const roleName = r.role_name.toUpperCase()
        if (roleName === "ADMIN" || r.id_role === 1) return "admin"
        if (roleName === "INTEGRANT" || r.id_role === 2) return "integrant"
        if (roleName === "CONSEJO" || r.id_role === 3) return "consejo"
        return "usuario"
      }) || [],
    esExterno: integrant.external,
    esAdministrador: integrant.roles?.some((r) => r.id_role === 1) || false,
  }
}

const mapTraceToIAuditLog = (
  trace: Trace,
  integrantsMap?: Map<number, IUser>,
): IAuditLog => {
  let tipoAccion: "crear" | "modificar" | "eliminar" | "consultar" = "consultar"
  if (trace.method === "POST") tipoAccion = "crear"
  else if (trace.method === "PUT" || trace.method === "PATCH")
    tipoAccion = "modificar"
  else if (trace.method === "DELETE") tipoAccion = "eliminar"

  const dateObj = trace.date ? new Date(trace.date) : new Date()
  const fecha = dateObj.toISOString().split("T")[0]
  const hora = dateObj.toTimeString().split(" ")[0]

  let usuario: IUser

  if (integrantsMap) {
    const integrantData = integrantsMap.get(trace.id_integrant)
    if (integrantData) {
      usuario = integrantData
    } else if (trace.integrant?.name) {
      const nameParts = trace.integrant.name.split(" ")
      usuario = {
        id: trace.integrant.id_integrant.toString(),
        nombre: nameParts[0] || "",
        apellidos: nameParts.slice(1).join(" ") || "",
        numeroIdentidad: "",
        correoElectronico: trace.integrant.email || "",
        nombreUsuario: trace.integrant.email?.split("@")[0] || "",
        roles: [],
        esExterno: false,
        esAdministrador: false,
      }
    } else {
      usuario = {
        id: trace.id_integrant.toString(),
        nombre: "",
        apellidos: "",
        numeroIdentidad: "",
        correoElectronico: "",
        nombreUsuario: "",
        roles: [],
        esExterno: false,
        esAdministrador: false,
      }
    }
  } else if (trace.integrant?.name) {
    const nameParts = trace.integrant.name.split(" ")
    usuario = {
      id: trace.integrant.id_integrant.toString(),
      nombre: nameParts[0] || "",
      apellidos: nameParts.slice(1).join(" ") || "",
      numeroIdentidad: "",
      correoElectronico: trace.integrant.email || "",
      nombreUsuario: trace.integrant.email?.split("@")[0] || "",
      roles: [],
      esExterno: false,
      esAdministrador: false,
    }
  } else {
    usuario = {
      id: trace.id_integrant.toString(),
      nombre: "",
      apellidos: "",
      numeroIdentidad: "",
      correoElectronico: "",
      nombreUsuario: "",
      roles: [],
      esExterno: false,
      esAdministrador: false,
    }
  }

  let codigo = trace.response ?? 200
  if (
    trace.response == null &&
    (trace.message?.includes("failed") || trace.message?.includes("Error"))
  ) {
    codigo = 500
  }

  return {
    id: trace.id_trace?.toString() || `trace-${trace.id_integrant}-${trace.date}`,
    usuario,
    fecha,
    hora,
    tipoAccion,
    origen: "API",
    metodo: (trace.method as "GET" | "POST" | "PUT" | "DELETE") || "GET",
    ruta: trace.route || "",
    codigo,
    mensaje: trace.message || "",
    detalles: trace.response ? { response: trace.response } : undefined,
  }
}

const buildApiFilters = (
  pageSkip: number,
  uiFilters: { tipoAccion: string; fechaInicio: string; fechaFin: string },
): TraceFilters => {
  const traceFilters: TraceFilters = {
    skip: pageSkip,
    limit: TRACE_PAGE_SIZE,
    date_order: "desc",
  }

  if (uiFilters.fechaInicio) {
    const startDate = new Date(uiFilters.fechaInicio)
    startDate.setHours(0, 0, 0, 0)
    traceFilters.start_date = startDate.toISOString()
  }

  if (uiFilters.fechaFin) {
    const endDate = new Date(uiFilters.fechaFin)
    endDate.setHours(23, 59, 59, 999)
    traceFilters.end_date = endDate.toISOString()
  }

  const method = mapTipoAccionToHttpMethod(uiFilters.tipoAccion)
  if (method) {
    traceFilters.method = method
  }

  return traceFilters
}

export const AuditLog = () => {
  const { showToast } = useToast()
  const [logs, setLogs] = useState<IAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState({
    tipoAccion: "",
    fechaInicio: "",
    fechaFin: "",
  })

  const skipRef = useRef(0)
  const integrantsMapRef = useRef(new Map<number, IUser>())
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef(filters)
  const loadingRef = useRef(false)
  const loadingMoreRef = useRef(false)

  filtersRef.current = filters

  const enrichIntegrants = useCallback(async (traces: Trace[]) => {
    const idsToLoad = traces
      .map((t) => t.id_integrant)
      .filter((id) => !integrantsMapRef.current.has(id))

    const uniqueIds = [...new Set(idsToLoad)]
    if (uniqueIds.length === 0) return

    const integrants = await Promise.all(
      uniqueIds.map((id) =>
        integrantService.getIntegrantById(id).catch((err) => {
          console.warn(`Error cargando integrante ${id}:`, err)
          return null
        }),
      ),
    )

    integrants.forEach((integrant) => {
      if (integrant) {
        integrantsMapRef.current.set(
          integrant.id_integrant,
          mapIntegrantToIUser(integrant),
        )
      }
    })
  }, [])

  const loadPage = useCallback(
    async (pageSkip: number, replace: boolean) => {
      if (replace) {
        if (loadingRef.current) return
        loadingRef.current = true
        setLoading(true)
      } else {
        if (loadingMoreRef.current || loadingRef.current) return
        loadingMoreRef.current = true
        setLoadingMore(true)
      }

      try {
        const apiFilters = buildApiFilters(pageSkip, filtersRef.current)
        const { items, hasMore: pageHasMore } =
          await traceService.getTracesPage(apiFilters)

        await enrichIntegrants(items)

        const mapped = items.map((trace) =>
          mapTraceToIAuditLog(trace, integrantsMapRef.current),
        )

        setLogs((prev) => (replace ? mapped : [...prev, ...mapped]))
        skipRef.current = pageSkip + items.length
        setHasMore(pageHasMore)
      } catch (err) {
        console.error("Error loading audit logs:", err)
        showToast(
          err instanceof Error ? err.message : "Error al cargar las trazas",
          "error",
        )
      } finally {
        if (replace) {
          loadingRef.current = false
          setLoading(false)
        } else {
          loadingMoreRef.current = false
          setLoadingMore(false)
        }
      }
    },
    [enrichIntegrants],
  )

  const handleFilter = () => {
    skipRef.current = 0
    setHasMore(true)
    setLogs([])
    loadPage(0, true)
  }

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingRef.current || loadingMoreRef.current) return
    loadPage(skipRef.current, false)
  }, [hasMore, loadPage])

  useEffect(() => {
    loadPage(0, true)
  }, [loadPage])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || !hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore()
        }
      },
      { rootMargin: "120px" },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, logs.length, handleLoadMore])

  const columns = [
    { key: "fecha", header: "Fecha" },
    { key: "hora", header: "Hora" },
    {
      key: "usuario",
      header: "Usuario",
      render: (log: IAuditLog) => log.usuario.nombreUsuario,
    },
    {
      key: "metodo",
      header: "Método",
      render: (log: IAuditLog) => (
        <span className={`method-badge method-${log.metodo}`}>{log.metodo}</span>
      ),
    },
    { key: "ruta", header: "Ruta" },
    {
      key: "codigo",
      header: "Código",
      render: (log: IAuditLog) => (
        <span className={`code-badge code-${Math.floor(log.codigo / 100)}`}>
          {log.codigo}
        </span>
      ),
    },
    { key: "mensaje", header: "Mensaje" },
  ]

  return (
    <div className="list-page audit-log">
      <div className="page-toolbar list-page__toolbar">
        <p className="page-toolbar__lead">
          Registro de todas las operaciones realizadas en el sistema.
        </p>
      </div>

      <Card className="list-page__panel">
        <div className="list-page__filters">
          <div className="list-page__filter-group">
            <label htmlFor="audit-tipo-accion">Tipo de acción</label>
            <select
              id="audit-tipo-accion"
              value={filters.tipoAccion}
              onChange={(e) =>
                setFilters({ ...filters, tipoAccion: e.target.value })
              }
              className="list-page__select"
            >
              <option value="">Todas</option>
              <option value="crear">Crear</option>
              <option value="modificar">Modificar</option>
              <option value="eliminar">Eliminar</option>
              <option value="consultar">Consultar</option>
            </select>
          </div>
          <div className="list-page__filter-group">
            <label htmlFor="audit-fecha-inicio">Fecha inicio</label>
            <Input
              id="audit-fecha-inicio"
              type="date"
              value={filters.fechaInicio}
              onChange={(e) =>
                setFilters({ ...filters, fechaInicio: e.target.value })
              }
            />
          </div>
          <div className="list-page__filter-group">
            <label htmlFor="audit-fecha-fin">Fecha fin</label>
            <Input
              id="audit-fecha-fin"
              type="date"
              value={filters.fechaFin}
              onChange={(e) =>
                setFilters({ ...filters, fechaFin: e.target.value })
              }
            />
          </div>
          <Button onClick={handleFilter} disabled={loading || loadingMore}>
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              "Filtrar"
            )}
          </Button>
        </div>

        <div className="list-page__body">
          {loading ? (
            <div className="list-page__loading" role="status" aria-live="polite">
              <Loader2 className="animate-spin" size={32} aria-hidden />
              <span>Cargando trazas...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="list-page__empty">
              <p>No se encontraron trazas</p>
            </div>
          ) : (
            <>
              <p className="list-page__count">
                {logs.length} {logs.length === 1 ? "registro" : "registros"}
                {hasMore ? " cargados" : " en la bitácora"}
              </p>
              <Table data={logs} columns={columns} />
              <div
                ref={loadMoreRef}
                className="audit-log-sentinel"
                aria-hidden="true"
              />
              {loadingMore && (
                <div
                  className="audit-log-status audit-log-status--more"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="animate-spin" size={24} aria-hidden />
                  <span>Cargando más registros...</span>
                </div>
              )}
              {!hasMore && logs.length > 0 && (
                <p className="audit-log-end">No hay más registros</p>
              )}
              {hasMore && !loadingMore && logs.length > 0 && (
                <div className="audit-log-load-more">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleLoadMore}
                    aria-label="Cargar 20 registros más de la bitácora"
                  >
                    Cargar más
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
