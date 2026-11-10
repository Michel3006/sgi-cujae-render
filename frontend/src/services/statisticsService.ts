import type { IStatisticsTabular, IStatisticsGraphical, IStatisticData, RecordType } from "../types"
import { apiClient } from "./api/client"
import { recordMetadataService } from "./record/recordMetadataService"
import { projectService } from "./projectService"
import type { Project, ProjectWithMembers } from "../types/api/project"
import {
  buildEmptyXlsxInfoBlob,
  buildStatisticsPdfBlob,
  buildTabularStatisticsXlsxBlob,
  type RecordStatsForExport,
  type StatisticsPdfBundle,
  type StatisticsPdfChartOptions,
} from "./statisticsReportExport"

// Cache de facultades para evitar múltiples llamadas
let facultiesCache: { id_faculty: number; name: string }[] | null = null

async function getFacultiesCache(): Promise<{ id_faculty: number; name: string }[]> {
  if (!facultiesCache) {
    try {
      const faculties = await recordMetadataService.getFaculties()
      facultiesCache = faculties.map((f) => ({
        id_faculty: f.id_faculty,
        name: f.name,
      }))
    } catch (e) {
      console.error("Error cargando facultades:", e)
      facultiesCache = []
    }
  }
  return facultiesCache
}

async function getFacultyIdByName(facultyName: string): Promise<number | null> {
  if (!facultyName || facultyName === "Todas") return null
  const faculties = await getFacultiesCache()
  const match = faculties.find((f) => f.name === facultyName)
  return match?.id_faculty ?? null
}

const getFacultyLabelFromProject = (project: Project): string =>
  project.faculty?.name?.trim() || "Sin facultad"

const aggregateProjectsTabular = (
  projects: ProjectWithMembers[],
): {
  porFacultad: Record<string, number>
  integrantesPorProyecto: Record<string, number>
} => {
  const porFacultad: Record<string, number> = {}
  const integrantesPorProyecto: Record<string, number> = {}

  projects.forEach((project) => {
    const facultad = getFacultyLabelFromProject(project)
    porFacultad[facultad] = (porFacultad[facultad] || 0) + 1
    const memberCount = Array.isArray(project.members) ? project.members.length : 0
    integrantesPorProyecto[facultad] = (integrantesPorProyecto[facultad] || 0) + memberCount
  })

  return { porFacultad, integrantesPorProyecto }
}

const aggregateProjectsGraphical = (
  projects: ProjectWithMembers[],
): {
  porFacultad: IStatisticData[]
  porEstado: IStatisticData[]
  porAño: Record<number, number>
} => {
  const porFacultadMap: Record<string, number> = {}
  const estadoCounts: Record<string, number> = {}
  const porAño: Record<number, number> = {}

  projects.forEach((project) => {
    const facultad = getFacultyLabelFromProject(project)
    porFacultadMap[facultad] = (porFacultadMap[facultad] || 0) + 1

    const estado =
      project.state?.name ??
      project.project_state?.name ??
      (project as { estado?: string }).estado ??
      "Sin estado"
    estadoCounts[estado] = (estadoCounts[estado] || 0) + 1

    const startDate = project.initial_date ?? project.start_date ?? null
    if (startDate) {
      const projectYear = new Date(startDate).getFullYear()
      if (!Number.isNaN(projectYear)) {
        porAño[projectYear] = (porAño[projectYear] || 0) + 1
      }
    }
  })

  return {
    porFacultad: Object.entries(porFacultadMap).map(([label, value]) => ({ label, value })),
    porEstado: Object.entries(estadoCounts).map(([label, value]) => ({ label, value })),
    porAño,
  }
}

async function fetchProjectsForStatistics(): Promise<ProjectWithMembers[]> {
  const projects = await projectService.getAllProjects({ skip: 0, limit: 5000 })
  return projects as ProjectWithMembers[]
}

const applyProjectCountRows = (
  rows: unknown[],
  proyectosPorFacultad: Record<string, number>,
  integrantesPorProyecto: Record<string, number>,
): void => {
  rows.forEach((item: unknown) => {
    if (!item || typeof item !== "object") return
    const row = item as Record<string, unknown>
    const facultad =
      (typeof row.faculty_name === "string" && row.faculty_name) ||
      (row.faculty && typeof row.faculty === "object" && typeof (row.faculty as { name?: string }).name === "string"
        ? (row.faculty as { name: string }).name
        : null) ||
      (typeof row.name === "string" && row.name) ||
      "Sin facultad"
    const cantidad =
      (typeof row.project_count === "number" && row.project_count) ||
      (typeof row.total_projects === "number" && row.total_projects) ||
      (typeof row.count === "number" && row.count) ||
      0
    proyectosPorFacultad[facultad] = (proyectosPorFacultad[facultad] || 0) + cantidad

    const integrantes =
      (typeof row.total_members === "number" && row.total_members) ||
      (typeof row.member_count === "number" && row.member_count) ||
      0
    if (integrantes > 0) {
      integrantesPorProyecto[facultad] = (integrantesPorProyecto[facultad] || 0) + integrantes
    }
  })
}

class StatisticsService {
  /**
   * Estadísticas tabulares conectadas al backend.
   * - Registros: totales por tipo a nivel de centro y % de aporte de la facultad seleccionada.
   * - Grupos: totales por facultad y total de integrantes por facultad.
   * - Proyectos: totales por facultad y total de integrantes por facultad.
   */
  async getTabularStatistics(selectedFacultyName?: string): Promise<IStatisticsTabular> {
    // 1) Estadísticas de REGISTROS (totales del centro + % aporte facultad)
    const recordEndpoints: { tipo: RecordType; path: string; countFacultyPath: string }[] = [
      { tipo: "articulo", path: "/articles/", countFacultyPath: "/articles/count/faculty/" },
      { tipo: "libro", path: "/books/", countFacultyPath: "/books/count/faculty/" },
      { tipo: "monografia", path: "/monographs/", countFacultyPath: "/monographs/count/" },
      { tipo: "norma", path: "/norms/", countFacultyPath: "/norms/count/" },
      { tipo: "patente", path: "/patents/", countFacultyPath: "/patents/count/" },
      { tipo: "software", path: "/softwares/", countFacultyPath: "/softwares/count/" },
      { tipo: "evento", path: "/encounters/", countFacultyPath: "/encounters/count/faculty/" },
      { tipo: "premio", path: "/prizes/", countFacultyPath: "/prizes/count/" },
      { tipo: "tesis", path: "/theses/", countFacultyPath: "/theses/count/" },
    ]

    const registrosPorTipo: Record<RecordType, number> = {} as any
    const porcentajeAportePorTipo: Record<RecordType, number> = {} as any

    // Totales a nivel de centro
    await Promise.all(
      recordEndpoints.map(async ({ tipo, path }) => {
        try {
          const response = await apiClient.get(path)
          const data = Array.isArray(response.data) ? response.data : []
          registrosPorTipo[tipo] = data.length
        } catch (e) {
          console.error(`Error cargando registros de ${tipo} para tabla:`, e)
          registrosPorTipo[tipo] = 0
        }
      }),
    )

    const totalRegistros = Object.values(registrosPorTipo).reduce((acc, v) => acc + v, 0)

    // Si no hay facultad seleccionada (o es "Todas"), % = 100 por definición
    if (!selectedFacultyName || selectedFacultyName === "Todas") {
      ;(Object.keys(registrosPorTipo) as RecordType[]).forEach((tipo) => {
        porcentajeAportePorTipo[tipo] = registrosPorTipo[tipo] > 0 ? 100 : 0
      })
    } else {
      const facultyId = await getFacultyIdByName(selectedFacultyName)

      if (!facultyId) {
        console.warn("No se encontró la facultad para estadísticas de registros:", selectedFacultyName)
        ;(Object.keys(registrosPorTipo) as RecordType[]).forEach((tipo) => {
          porcentajeAportePorTipo[tipo] = 0
        })
      } else {
        // Para cada tipo, llamar a su endpoint de conteo por facultad
        await Promise.all(
          recordEndpoints.map(async ({ tipo, countFacultyPath }) => {
            try {
              const response = await apiClient.get(`${countFacultyPath}${facultyId}`)
              const data = response.data

              // Intentamos leer distintos nombres posibles de campos según el tipo
              const totalCentro =
                data.total ??
                data.total_articles ??
                data.total_books ??
                data.total_monographs ??
                data.total_monograph ??
                data.total_norms ??
                data.total_patents ??
                data.total_softwares ??
                data.total_prizes ??
                data.total_theses ??
                data.total_encounters ??
                registrosPorTipo[tipo] ??
                0

              const totalFacultad =
                data.faculty_total ??
                data.total_for_faculty ??
                data.count_for_faculty ??
                data.faculty_count ??
                data.articles_in_faculty ??
                data.books_in_faculty ??
                data.monographs_in_faculty ??
                data.monograph_in_faculty ??
                data.norms_in_faculty ??
                data.patents_in_faculty ??
                data.softwares_in_faculty ??
                data.prizes_in_faculty ??
                data.theses_in_faculty ??
                data.encounters_in_faculty ??
                0

              const base = totalCentro || registrosPorTipo[tipo] || 0
              porcentajeAportePorTipo[tipo] = base > 0 ? (totalFacultad / base) * 100 : 0
            } catch (e) {
              console.error(`Error cargando conteos por facultad para ${tipo}:`, e)
              porcentajeAportePorTipo[tipo] = 0
            }
          }),
        )
      }
    }

    // 2) Estadísticas de GRUPOS usando endpoints reales
    const gruposPorFacultad: Record<string, number> = {}
    const integrantesPorGrupo: Record<string, number> = {}

    try {
      const groupCountsResponse = await apiClient.get("/groups/count/faculty")
      const groupCounts = Array.isArray(groupCountsResponse.data) ? groupCountsResponse.data : []
      groupCounts.forEach((item: any) => {
        const facultad = item.faculty_name ?? item.faculty?.name ?? item.name ?? "Sin facultad"
        const cantidad = item.total_groups ?? item.group_count ?? item.count ?? 0
        gruposPorFacultad[facultad] = (gruposPorFacultad[facultad] || 0) + cantidad
      })
    } catch (e) {
      console.error("Error cargando conteos de grupos por facultad:", e)
    }

    try {
      const groupsWithMembersResponse = await apiClient.get("/groups/count/by_members")
      const groupsWithMembers = Array.isArray(groupsWithMembersResponse.data)
        ? groupsWithMembersResponse.data
        : []

      // Agrupar integrantes por facultad
      const integrantesPorFacultad: Record<string, number> = {}
      groupsWithMembers.forEach((item: any) => {
        const facultad = item.faculty_name ?? item.faculty?.name ?? "Sin facultad"
        const members = item.total_members ?? item.member_count ?? 0
        integrantesPorFacultad[facultad] = (integrantesPorFacultad[facultad] || 0) + members
      })

      // También guardar por grupo individual para compatibilidad
      groupsWithMembers.forEach((item: any) => {
        const groupName = item.group_name ?? item.name ?? "Grupo sin nombre"
        const members = item.total_members ?? item.member_count ?? 0
        integrantesPorGrupo[groupName] = members
      })
    } catch (e) {
      console.error("Error cargando conteos de integrantes por grupo:", e)
    }

    const totalGrupos = Object.values(gruposPorFacultad).reduce((acc, v) => acc + v, 0)

    // 3) Estadísticas de PROYECTOS usando endpoint de conteo por facultad
    const proyectosPorFacultad: Record<string, number> = {}
    const integrantesPorProyecto: Record<string, number> = {}

    try {
      const projectCountsResponse = await apiClient.get("/projects/count/faculty/")
      const projectCounts = Array.isArray(projectCountsResponse.data)
        ? projectCountsResponse.data
        : []
      applyProjectCountRows(projectCounts, proyectosPorFacultad, integrantesPorProyecto)
    } catch (e) {
      console.error("Error cargando conteos de proyectos por facultad:", e)
    }

    let totalProyectos = Object.values(proyectosPorFacultad).reduce((acc, v) => acc + v, 0)

    if (totalProyectos === 0) {
      try {
        const projects = await fetchProjectsForStatistics()
        if (projects.length > 0) {
          const aggregated = aggregateProjectsTabular(projects)
          Object.assign(proyectosPorFacultad, aggregated.porFacultad)
          Object.assign(integrantesPorProyecto, aggregated.integrantesPorProyecto)
          totalProyectos = projects.length
        }
      } catch (e) {
        console.error("Error cargando proyectos para estadísticas tabulares:", e)
      }
    }

    return {
      grupos: {
        total: totalGrupos,
        porFacultad: gruposPorFacultad,
        integrantesPorGrupo,
      },
      registros: {
        total: totalRegistros,
        porTipo: registrosPorTipo,
        porcentajeAportePorTipo,
      },
      proyectos: {
        total: totalProyectos,
        porFacultad: proyectosPorFacultad,
        integrantesPorProyecto,
      },
    }
  }

  /**
   * Estadísticas gráficas conectadas al backend.
   * - Registros: total por año filtrado y total por facultad en ese año.
   * - Grupos: cantidad por facultad y grupos con más integrantes (con nombres reales).
   * - Proyectos: cantidad por facultad y proyectos por estado.
   */
  async getGraphicalStatistics(
    year?: number,
    selectedFacultyName?: string,
  ): Promise<IStatisticsGraphical> {
    const targetYear = year ?? new Date().getFullYear()

    // 1) Estadísticas gráficas de REGISTROS
    const recordEndpoints: { tipo: RecordType; path: string; countFacultyPath: string }[] = [
      { tipo: "articulo", path: "/articles/", countFacultyPath: "/articles/count/faculty/" },
      { tipo: "libro", path: "/books/", countFacultyPath: "/books/count/faculty/" },
      { tipo: "monografia", path: "/monographs/", countFacultyPath: "/monographs/count/" },
      { tipo: "norma", path: "/norms/", countFacultyPath: "/norms/count/" },
      { tipo: "patente", path: "/patents/", countFacultyPath: "/patents/count/" },
      { tipo: "software", path: "/softwares/", countFacultyPath: "/softwares/count/" },
      { tipo: "evento", path: "/encounters/", countFacultyPath: "/encounters/count/faculty/" },
      { tipo: "premio", path: "/prizes/", countFacultyPath: "/prizes/count/" },
      { tipo: "tesis", path: "/theses/", countFacultyPath: "/theses/count/" },
    ]

    const indicadoresRegistrosPorAño: Record<number, Record<RecordType, number>> = {}
    indicadoresRegistrosPorAño[targetYear] = {} as Record<RecordType, number>

    // Obtener totales por tipo para el año seleccionado
    await Promise.all(
      recordEndpoints.map(async ({ tipo, path }) => {
        try {
          const response = await apiClient.get(path, {
            params: { year_only: targetYear },
          })
          const data = Array.isArray(response.data) ? response.data : []
          indicadoresRegistrosPorAño[targetYear][tipo] = data.length
        } catch (e) {
          console.error(`Error cargando registros de ${tipo} para estadísticas:`, e)
          indicadoresRegistrosPorAño[targetYear][tipo] = 0
        }
      }),
    )

    // Obtener registros por facultad si hay una facultad seleccionada
    let registrosPorFacultadEnAño: Record<string, Record<RecordType, number>> = {}
    if (selectedFacultyName && selectedFacultyName !== "Todas") {
      const facultyId = await getFacultyIdByName(selectedFacultyName)
      if (facultyId) {
        await Promise.all(
          recordEndpoints.map(async ({ tipo, countFacultyPath }) => {
            try {
              const response = await apiClient.get(`${countFacultyPath}${facultyId}`)
              const data = response.data
              const totalFacultad =
                data.faculty_total ??
                data.total_for_faculty ??
                data.count_for_faculty ??
                data.faculty_count ??
                data.articles_in_faculty ??
                data.books_in_faculty ??
                data.monographs_in_faculty ??
                data.monograph_in_faculty ??
                data.norms_in_faculty ??
                data.patents_in_faculty ??
                data.softwares_in_faculty ??
                data.prizes_in_faculty ??
                data.theses_in_faculty ??
                data.encounters_in_faculty ??
                0

              if (!registrosPorFacultadEnAño[selectedFacultyName]) {
                registrosPorFacultadEnAño[selectedFacultyName] = {} as Record<RecordType, number>
              }
              registrosPorFacultadEnAño[selectedFacultyName][tipo] = totalFacultad
            } catch (e) {
              console.error(`Error cargando registros de ${tipo} por facultad:`, e)
            }
          }),
        )
      }
    }

    // 2) Estadísticas de GRUPOS
    let gruposPorFacultad: IStatisticData[] = []
    let gruposConMasEstudiantes: IStatisticData[] = []

    try {
      const groupCountsResponse = await apiClient.get("/groups/count/faculty")
      const groupCounts = Array.isArray(groupCountsResponse.data) ? groupCountsResponse.data : []
      gruposPorFacultad = groupCounts.map((item: any) => ({
        label: item.faculty_name ?? item.faculty?.name ?? item.name ?? "Sin facultad",
        value: item.total_groups ?? item.group_count ?? item.count ?? 0,
      }))
    } catch (e) {
      console.error("Error cargando grupos por facultad:", e)
    }

    try {
      const groupsWithMembersResponse = await apiClient.get("/groups/count/by_members")
      const groupsWithMembers = Array.isArray(groupsWithMembersResponse.data)
        ? groupsWithMembersResponse.data
        : []

      // Ordenar por número de integrantes y tomar los primeros (sin límite de 3)
      gruposConMasEstudiantes = groupsWithMembers
        .map((item: any) => ({
          label: item.group_name ?? item.name ?? "Grupo sin nombre",
          value: item.total_members ?? item.member_count ?? 0,
        }))
        .sort((a, b) => b.value - a.value)
        // Mostrar todos los grupos, no solo 3
    } catch (e) {
      console.error("Error cargando grupos con más integrantes:", e)
    }

    // Obtener total de grupos
    let gruposTotales = 0
    try {
      const groupsResponse = await apiClient.get("/groups/", { params: { limit: 1 } })
      // Si el backend devuelve un total, usarlo; si no, contar los grupos por facultad
      gruposTotales = gruposPorFacultad.reduce((acc, g) => acc + g.value, 0)
    } catch (e) {
      console.error("Error obteniendo total de grupos:", e)
    }

    // 3) Estadísticas de PROYECTOS
    let proyectosPorFacultad: IStatisticData[] = []
    let proyectosPorEstado: IStatisticData[] = []
    let indicadoresProyectosPorAño: Record<number, number> = {}

    try {
      const projectCountsResponse = await apiClient.get("/projects/count/faculty/")
      const projectCounts = Array.isArray(projectCountsResponse.data)
        ? projectCountsResponse.data
        : []
      const porFacultadMap: Record<string, number> = {}
      const integrantesMap: Record<string, number> = {}
      applyProjectCountRows(projectCounts, porFacultadMap, integrantesMap)
      proyectosPorFacultad = Object.entries(porFacultadMap).map(([label, value]) => ({
        label,
        value,
      }))
    } catch (e) {
      console.error("Error cargando proyectos por facultad:", e)
    }

    let projectsForStats: Project[] = []
    try {
      projectsForStats = await fetchProjectsForStatistics()
    } catch (e) {
      console.error("Error cargando listado de proyectos para estadísticas:", e)
    }

    if (projectsForStats.length > 0) {
      const aggregated = aggregateProjectsGraphical(projectsForStats)
      const proyectosPorFacultadTotal = proyectosPorFacultad.reduce((acc, item) => acc + item.value, 0)
      if (proyectosPorFacultadTotal === 0) {
        proyectosPorFacultad = aggregated.porFacultad
      }
      proyectosPorEstado = aggregated.porEstado
      indicadoresProyectosPorAño = aggregated.porAño
    }

    return {
      gruposTotales,
      gruposPorFacultad,
      gruposConMasResultados: gruposConMasEstudiantes, // Reutilizamos los grupos con más integrantes
      gruposConMasArticulos: [], // Por ahora vacío, se puede implementar después
      gruposConMasProyectos: [], // Por ahora vacío, se puede implementar después
      gruposConMasEstudiantes,
      indicadoresRegistrosPorAño,
      indicadoresProyectosPorAño,
      // Datos adicionales para gráficos de proyectos y registros por facultad
      proyectosPorFacultad,
      proyectosPorEstado,
      registrosPorFacultadEnAño,
    } as any
  }

  async generateReport(
    tipo: "pdf" | "xlsx",
    data: any,
    category?: "registros" | "grupos" | "proyectos",
    view?: "tabular" | "graphical",
    recordStats?: RecordStatsForExport,
    chartOptions?: StatisticsPdfChartOptions,
    graphicalForPdf?: IStatisticsGraphical | null,
  ): Promise<Blob> {
    const fecha = new Date().toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

    if (tipo === "pdf") {
      const bundle: StatisticsPdfBundle = {
        tabular:
          view === "tabular" && data && typeof data === "object" && "registros" in data
            ? (data as IStatisticsTabular)
            : null,
        graphical: graphicalForPdf ?? (view === "graphical" ? (data as IStatisticsGraphical) : null),
      }
      return buildStatisticsPdfBlob(bundle, fecha, category, view, recordStats, chartOptions)
    }

    if (view !== "tabular" || !data) {
      return buildEmptyXlsxInfoBlob()
    }

    return buildTabularStatisticsXlsxBlob(
      data as IStatisticsTabular,
      fecha,
      category,
      view,
      recordStats,
    )
  }
}

export const statisticsService = new StatisticsService()
