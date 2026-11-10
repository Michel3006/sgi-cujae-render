"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { IStatisticsTabular, IStatisticsGraphical } from "../types"
import { statisticsService } from "../services/statisticsService"
import { recordMetadataService, type FacultyOption } from "../services/record/recordMetadataService"
import { apiClient } from "../services/api/client"
import { Card } from "../components/common/Card"
import { Button } from "../components/common/Button"
import { usePermissions } from "../hooks/usePermissions"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts"
import "./Statistics.css"

type StatisticsCategory = "registros" | "grupos" | "proyectos"
type GroupVisualizationType = "porFacultad" | "masIntegrantes"
type ProjectVisualizationType = "porFacultad" | "porEstado"

export const Statistics = () => {
  const navigate = useNavigate()
  const { canViewStatistics } = usePermissions()
  const [view, setView] = useState<"tabular" | "graphical">("tabular")
  const [category, setCategory] = useState<StatisticsCategory>("registros")
  const [tabularData, setTabularData] = useState<IStatisticsTabular | null>(null)
  const [graphicalData, setGraphicalData] = useState<IStatisticsGraphical | null>(null)
  const [selectedYear, setSelectedYear] = useState(2024)
  const [selectedFacultad, setSelectedFacultad] = useState<string>("Todas")
  const [selectedFacultadId, setSelectedFacultadId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [groupVisualizationType, setGroupVisualizationType] = useState<GroupVisualizationType>("porFacultad")
  const [projectVisualizationType, setProjectVisualizationType] = useState<ProjectVisualizationType>("porFacultad")
  const [faculties, setFaculties] = useState<FacultyOption[]>([])
  const [recordStats, setRecordStats] = useState<Record<string, { total: number; inFaculty: number }>>({})
  const [loadingRecords, setLoadingRecords] = useState(false)

  // Verificar permisos al montar el componente
  useEffect(() => {
    if (!canViewStatistics()) {
      navigate("/dashboard")
    }
  }, [canViewStatistics, navigate])

  // Cargar facultades al montar el componente
  useEffect(() => {
    const loadFaculties = async () => {
      try {
        const facultiesData = await recordMetadataService.getFaculties()
        setFaculties(facultiesData)
      } catch (error) {
        console.error("Error loading faculties:", error)
      }
    }
    loadFaculties()
  }, [])

  // Cargar estadísticas de registros cuando cambia la facultad seleccionada
  useEffect(() => {
    if (category === "registros" && view === "tabular") {
      loadRecordStatistics()
    }
  }, [selectedFacultadId, category, view])

  useEffect(() => {
    loadStatistics()
  }, [view, selectedYear, category, selectedFacultad])

  const loadStatistics = async () => {
    setLoading(true)
    try {
      if (view === "tabular") {
        const data = await statisticsService.getTabularStatistics(
          selectedFacultad === "Todas" ? undefined : selectedFacultad,
        )
        setTabularData(data)
      } else {
        const data = await statisticsService.getGraphicalStatistics(
          selectedYear,
          selectedFacultad === "Todas" ? undefined : selectedFacultad,
        )
        setGraphicalData(data)
      }
    } catch (error) {
      console.error("Error loading statistics:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecordStatistics = async () => {
    if (!selectedFacultadId) {
      // Si no hay facultad seleccionada, limpiar estadísticas
      setRecordStats({})
      return
    }

    setLoadingRecords(true)
    try {
      // Rutas alineadas con backend/modules/*/routes.py (conteos por facultad)
      const recordTypes: {
        key: string
        buildCountUrl: (facultyId: number) => string
        totalKey: string
        inFacultyKey: string
      }[] = [
        {
          key: "articulo",
          buildCountUrl: (id) => `/articles/count/faculty/${id}`,
          totalKey: "total_articles",
          inFacultyKey: "articles_in_faculty",
        },
        {
          key: "libro",
          buildCountUrl: (id) => `/books/count/faculty/${id}`,
          totalKey: "total_books",
          inFacultyKey: "books_in_faculty",
        },
        {
          key: "monografia",
          buildCountUrl: (id) => `/monographs/count/${id}`,
          totalKey: "total_monograph",
          inFacultyKey: "monograph_in_faculty",
        },
        { key: "norma", buildCountUrl: (id) => `/norms/count/${id}`, totalKey: "total_norms", inFacultyKey: "norms_in_faculty" },
        {
          key: "patente",
          buildCountUrl: (id) => `/patents/count/${id}`,
          totalKey: "total_patents",
          inFacultyKey: "patents_in_faculty",
        },
        {
          key: "software",
          buildCountUrl: (id) => `/softwares/count/${id}`,
          totalKey: "total_softwares",
          inFacultyKey: "softwares_in_faculty",
        },
        {
          key: "tesis",
          buildCountUrl: (id) => `/theses/count/${id}`,
          totalKey: "total_theses",
          inFacultyKey: "theses_in_faculty",
        },
        {
          key: "evento",
          buildCountUrl: (id) => `/encounters/count/faculty/${id}`,
          totalKey: "total_encounters",
          inFacultyKey: "encounters_in_faculty",
        },
        { key: "premio", buildCountUrl: (id) => `/prizes/count/${id}`, totalKey: "total_prizes", inFacultyKey: "prizes_in_faculty" },
      ]

      // Hacer todas las peticiones en paralelo
      const promises = recordTypes.map(async (recordType) => {
        try {
          const response = await apiClient.get(recordType.buildCountUrl(selectedFacultadId))
          const data = response.data
          return {
            key: recordType.key,
            total: data[recordType.totalKey] || 0,
            inFaculty: data[recordType.inFacultyKey] || 0,
          }
        } catch (error) {
          console.error(`Error loading ${recordType.key} statistics:`, error)
          return {
            key: recordType.key,
            total: 0,
            inFaculty: 0,
          }
        }
      })

      const results = await Promise.all(promises)
      const statsMap: Record<string, { total: number; inFaculty: number }> = {}
      results.forEach((result) => {
        statsMap[result.key] = { total: result.total, inFaculty: result.inFaculty }
      })
      setRecordStats(statsMap)
    } catch (error) {
      console.error("Error loading record statistics:", error)
    } finally {
      setLoadingRecords(false)
    }
  }

  const handleFacultadChange = (facultadName: string) => {
    setSelectedFacultad(facultadName)
    if (facultadName === "Todas") {
      setSelectedFacultadId(null)
    } else {
      const faculty = faculties.find((f) => f.name === facultadName)
      setSelectedFacultadId(faculty?.id_faculty || null)
    }
  }

  const handleExportPDF = async () => {
    const data = view === "tabular" ? tabularData : graphicalData
    const statsForRegistros =
      view === "tabular" && category === "registros" && Object.keys(recordStats).length > 0
        ? recordStats
        : undefined

    let graphicalForPdf = graphicalData
    if (!graphicalForPdf) {
      try {
        graphicalForPdf = await statisticsService.getGraphicalStatistics(
          selectedYear,
          selectedFacultad === "Todas" ? undefined : selectedFacultad,
        )
      } catch (error) {
        console.error("Error cargando datos gráficos para PDF:", error)
      }
    }

    const blob = await statisticsService.generateReport(
      "pdf",
      data,
      category,
      view,
      statsForRegistros,
      {
        selectedYear,
        selectedFacultad,
        groupVisualizationType,
        projectVisualizationType,
      },
      graphicalForPdf,
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `estadisticas-${category}-${view}-${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportXLSX = async () => {
    // XLSX solo disponible para vista tabular
    if (view !== "tabular") return
    const data = tabularData
    if (!data) return
    const statsForRegistros =
      category === "registros" && Object.keys(recordStats).length > 0 ? recordStats : undefined
    const blob = await statisticsService.generateReport(
      "xlsx",
      data,
      category,
      view,
      statsForRegistros,
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `estadisticas-${category}-${view}-${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="statistics">
        <div className="loading" role="status" aria-live="polite">
          Cargando estadísticas...
        </div>
      </div>
    )
  }

  return (
    <div className="statistics">
      <div className="page-toolbar page-header page-header--with-actions">
        <p className="page-toolbar__lead">Indicadores y reportes de la actividad de investigación.</p>
        <div className="header-actions">
          <div className="view-toggle">
            <label>
              <input type="radio" name="view" checked={view === "tabular"} onChange={() => setView("tabular")} />
              Ver tabla
            </label>
            <label>
              <input type="radio" name="view" checked={view === "graphical"} onChange={() => setView("graphical")} />
              Ver gráficos
            </label>
          </div>
          <div className="export-buttons">
            <Button variant="secondary" onClick={handleExportPDF}>
              Exportar PDF
            </Button>
            {view === "tabular" && (
              <Button variant="secondary" onClick={handleExportXLSX}>
                Exportar XLSX
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="category-selector">
        <Button variant={category === "registros" ? "primary" : "secondary"} onClick={() => setCategory("registros")}>
          Registros Científicos
        </Button>
        <Button variant={category === "grupos" ? "primary" : "secondary"} onClick={() => setCategory("grupos")}>
          Grupos de Investigación
        </Button>
        <Button variant={category === "proyectos" ? "primary" : "secondary"} onClick={() => setCategory("proyectos")}>
          Proyectos de Investigación
        </Button>
      </div>

      {view === "tabular" && tabularData && (
        <div className="tabular-view">
          {category === "registros" && (
            <>
              <Card className="stats-card registros-card">
                <h2>Estadísticas de Registros Científicos</h2>
                <p className="stats-description">
                  Vista tabular que muestra los totales de cada tipo de registro del Centro, los subtotales de la facultad
                  seleccionada y el porcentaje de aporte que esta representa para el Centro.
                </p>

                <div className="filters-container" style={{ marginBottom: "1rem" }}>
                  <div className="facultad-selector">
                    <label>Filtrar por Facultad:</label>
                    <select value={selectedFacultad} onChange={(e) => handleFacultadChange(e.target.value)}>
                      <option value="Todas">Todas</option>
                      {faculties.map((faculty) => (
                        <option key={faculty.id_faculty} value={faculty.name}>
                          {faculty.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="stats-table-container">
                  {loadingRecords ? (
                    <div className="loading">Cargando estadísticas de registros...</div>
                  ) : (
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>Tipo de Registro</th>
                          <th>Total del Centro</th>
                          <th>Total de la Facultad</th>
                          <th>% Aporte de la Facultad al Centro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(recordStats).length === 0 && selectedFacultadId ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                              No hay datos disponibles
                            </td>
                          </tr>
                        ) : selectedFacultad === "Todas" ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                              Seleccione una facultad para ver las estadísticas
                            </td>
                          </tr>
                        ) : (
                          <>
                            {Object.entries(recordStats).map(([tipo, stats]) => {
                              const tipoLabel = tipo.charAt(0).toUpperCase() + tipo.slice(1)
                              const aporte = stats.total > 0 ? (stats.inFaculty / stats.total) * 100 : 0
                              return (
                                <tr key={tipo}>
                                  <td className="tipo-label">{tipoLabel}</td>
                                  <td className="total-value">{stats.total}</td>
                                  <td className="user-value">{stats.inFaculty}</td>
                                  <td className="aporte-value">{aporte.toFixed(1)}%</td>
                                </tr>
                              )
                            })}
                            <tr className="total-row">
                              <td>
                                <strong>Total</strong>
                              </td>
                              <td>
                                <strong>
                                  {Object.values(recordStats).reduce((sum, stats) => sum + stats.total, 0)}
                                </strong>
                              </td>
                              <td>
                                <strong>
                                  {Object.values(recordStats).reduce((sum, stats) => sum + stats.inFaculty, 0)}
                                </strong>
                              </td>
                              <td>
                                <strong>
                                  {(() => {
                                    const total = Object.values(recordStats).reduce((sum, stats) => sum + stats.total, 0)
                                    const inFaculty = Object.values(recordStats).reduce((sum, stats) => sum + stats.inFaculty, 0)
                                    return total > 0 ? ((inFaculty / total) * 100).toFixed(1) : "0.0"
                                  })()}%
                                </strong>
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </>
          )}

          {category === "grupos" && (
            <>
              <Card className="stats-card grupos-card">
                <h2>Estadísticas de Grupos de Investigación</h2>
                <p className="stats-description">
                  Vista tabular que muestra los totales de grupos registrados en el sistema, agrupados por criterio de
                  facultad a la que pertenecen, así como el total de integrantes que cada grupo posee.
                </p>

                <div className="stats-table-container">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Facultad</th>
                        <th>Cantidad de Grupos</th>
                        <th>Total de Integrantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(tabularData.grupos.porFacultad).map(([facultad, cantidad]) => {
                        const integrantes = tabularData.grupos.integrantesPorGrupo[facultad] || 0
                        return (
                          <tr key={facultad}>
                            <td className="facultad-label">{facultad}</td>
                            <td className="grupos-value">{cantidad}</td>
                            <td className="integrantes-value">{integrantes}</td>
                          </tr>
                        )
                      })}
                      <tr className="total-row">
                        <td>
                          <strong>Total</strong>
                        </td>
                        <td>
                          <strong>{tabularData.grupos.total}</strong>
                        </td>
                        <td>
                          <strong>
                            {Object.values(tabularData.grupos.integrantesPorGrupo).reduce((a, b) => a + b, 0)}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {category === "proyectos" && (
            <>
              <Card className="stats-card proyectos-card">
                <h2>Estadísticas de Proyectos de Investigación</h2>
                <p className="stats-description">
                  Vista tabular que muestra los totales de proyectos registrados en el sistema, agrupados por facultad y
                  el total de integrantes participantes en cada proyecto.
                </p>

                <div className="stats-table-container">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Facultad</th>
                        <th>Cantidad de Proyectos</th>
                        <th>Total de Integrantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(tabularData.proyectos.porFacultad).map(([facultad, cantidad]) => {
                        const integrantes = tabularData.proyectos.integrantesPorProyecto[facultad] || 0
                        return (
                          <tr key={facultad}>
                            <td className="facultad-label">{facultad}</td>
                            <td className="proyectos-value">{cantidad}</td>
                            <td className="integrantes-value">{integrantes}</td>
                          </tr>
                        )
                      })}
                      <tr className="total-row">
                        <td>
                          <strong>Total</strong>
                        </td>
                        <td>
                          <strong>{tabularData.proyectos.total}</strong>
                        </td>
                        <td>
                          <strong>
                            {Object.values(tabularData.proyectos.integrantesPorProyecto).reduce((a, b) => a + b, 0)}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {view === "graphical" && graphicalData && (
        <div className="graphical-view">
          <div className="filters-container">
            <div className="year-selector">
              <label>Año:</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                <option value={2020}>2020</option>
                <option value={2021}>2021</option>
                <option value={2022}>2022</option>
                <option value={2023}>2023</option>
                <option value={2024}>2024</option>
              </select>
            </div>

            {category === "registros" && (
              <div className="facultad-selector">
                <label>Facultad:</label>
                <select value={selectedFacultad} onChange={(e) => handleFacultadChange(e.target.value)}>
                  <option value="Todas">Todas</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id_faculty} value={faculty.name}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {category === "grupos" && (
              <div className="group-visualization-selector">
                <label>Ver:</label>
                <select
                  value={groupVisualizationType}
                  onChange={(e) => setGroupVisualizationType(e.target.value as GroupVisualizationType)}
                >
                  <option value="porFacultad">Grupos por facultad</option>
                  <option value="masIntegrantes">Grupos con más integrantes</option>
                </select>
              </div>
            )}

            {category === "proyectos" && (
              <div className="project-visualization-selector">
                <label>Ver:</label>
                <select
                  value={projectVisualizationType}
                  onChange={(e) => setProjectVisualizationType(e.target.value as ProjectVisualizationType)}
                >
                  <option value="porFacultad">Proyectos por facultad</option>
                  <option value="porEstado">Proyectos por estado</option>
                </select>
              </div>
            )}
          </div>

          {category === "registros" && (
            <Card className="chart-card">
              <h2>Registros Primarios por Tipo - Año {selectedYear}</h2>
              <p className="chart-description">
                Vista gráfica que refleja los indicadores generales de cada tipo de registro contra los indicadores
                parciales de cada área definida en el Sistema para el año especificado.
              </p>

              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart
                  data={Object.entries(graphicalData.indicadoresRegistrosPorAño[selectedYear] || {}).map(
                    ([tipo, total]) => {
                      const dataPoint: any = {
                        tipo,
                        total,
                      }
                      // Si hay una facultad seleccionada, mostrar solo esa facultad
                      if (selectedFacultad !== "Todas" && (graphicalData as any).registrosPorFacultadEnAño?.[selectedFacultad]) {
                        const facultadData = (graphicalData as any).registrosPorFacultadEnAño[selectedFacultad]
                        dataPoint[selectedFacultad] = facultadData[tipo] || 0
                      } else {
                        // Si no hay facultad seleccionada, mostrar todas las facultades
                        faculties.forEach((faculty) => {
                          const facultadData = (graphicalData as any).registrosPorFacultadEnAño?.[faculty.name]
                          if (facultadData) {
                            dataPoint[faculty.name] = facultadData[tipo] || 0
                          }
                        })
                      }
                      return dataPoint
                    },
                  )}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="tipo" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" label={{ value: "Total de registros", angle: -90, position: "insideLeft" }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{ value: "Subtotal por facultad", angle: 90, position: "insideRight" }}
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar yAxisId="left" dataKey="total" fill="#4A9EFF" name="Total" />
                  {selectedFacultad !== "Todas" ? (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={selectedFacultad}
                      stroke="#FFB347"
                      name={selectedFacultad}
                    />
                  ) : (
                    faculties.slice(0, 7).map((faculty, index) => {
                      const colors = ["#FFB347", "#90EE90", "#FF6B6B", "#C77DFF", "#FF8FAB", "#4ECDC4", "#95E1D3"]
                      return (
                        <Line
                          key={faculty.id_faculty}
                          yAxisId="right"
                          type="monotone"
                          dataKey={faculty.name}
                          stroke={colors[index % colors.length]}
                          name={faculty.name}
                        />
                      )
                    })
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          )}

          {category === "grupos" && (
            <Card className="chart-card">
              <h2>
                {groupVisualizationType === "porFacultad" && "Cantidad de Grupos por Facultad"}
                {groupVisualizationType === "masIntegrantes" && "Grupos con Más Integrantes"}
              </h2>
              <p className="chart-description">
                Vista gráfica que refleja diversos indicadores asociados a los grupos en los cuales se aprecian
                informaciones relevantes, ancladas a los resultados de estos grupos, sus proyectos e integrantes.
              </p>

              <div style={{ width: "100%", overflowX: "auto" }}>
                <ResponsiveContainer width={groupVisualizationType === "porFacultad" ? "100%" : 600} height={400} minWidth={groupVisualizationType === "porFacultad" ? 600 : undefined}>
                  {groupVisualizationType === "porFacultad" ? (
                    <BarChart
                      data={graphicalData.gruposPorFacultad}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="label" angle={-45} textAnchor="end" height={100} />
                      <YAxis label={{ value: "Cantidad de Grupos", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Grupos" fill="#7BA05B" />
                    </BarChart>
                  ) : (
                    <BarChart
                      data={graphicalData.gruposConMasEstudiantes || []}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" label={{ value: "Integrantes", position: "insideBottom" }} />
                      <YAxis dataKey="label" type="category" width={200} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#7D6B91" name="Integrantes" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {category === "proyectos" && (
            <>
              <Card className="chart-card">
                <h2>
                  {projectVisualizationType === "porFacultad" && `Proyectos por Facultad - Año ${selectedYear}`}
                  {projectVisualizationType === "porEstado" && "Proyectos por Estado"}
                </h2>
                <p className="chart-description">
                  Vista gráfica que refleja diversos indicadores asociados a los proyectos en los cuales se aprecian
                  informaciones relevantes sobre su distribución, resultados e integrantes.
                </p>

                <div style={{ width: "100%", overflowX: "auto" }}>
                  <ResponsiveContainer width={projectVisualizationType === "porFacultad" ? "100%" : 600} height={400} minWidth={projectVisualizationType === "porFacultad" ? 600 : undefined}>
                    {projectVisualizationType === "porFacultad" ? (
                      <BarChart
                        data={(graphicalData as any).proyectosPorFacultad || graphicalData.gruposPorFacultad}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="label"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          style={{ fontSize: "0.85rem", fontWeight: 500 }}
                        />
                        <YAxis
                          label={{
                            value: "Cantidad de Proyectos",
                            angle: -90,
                            position: "insideLeft",
                            style: { fontSize: "0.9rem", fontWeight: 600 },
                          }}
                          style={{ fontSize: "0.85rem", fontWeight: 500 }}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            borderRadius: "0.5rem",
                            border: "1px solid #e0e0e0",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "0.9rem", fontWeight: 600 }} />
                        <Bar dataKey="value" name="Proyectos" fill="#6B8FA3" />
                      </BarChart>
                    ) : (
                      <BarChart
                        data={(graphicalData as any).proyectosPorEstado || []}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="label" style={{ fontSize: "0.85rem", fontWeight: 500 }} />
                        <YAxis
                          label={{
                            value: "Cantidad de Proyectos",
                            angle: -90,
                            position: "insideLeft",
                            style: { fontSize: "0.9rem", fontWeight: 600 },
                          }}
                          style={{ fontSize: "0.85rem", fontWeight: 500 }}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            borderRadius: "0.5rem",
                            border: "1px solid #e0e0e0",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "0.9rem", fontWeight: 600 }} />
                        <Bar dataKey="value" name="Proyectos" fill="#6B8FA3" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Statistics
