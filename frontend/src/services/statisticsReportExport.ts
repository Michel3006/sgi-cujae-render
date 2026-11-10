import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import type { IStatisticsTabular, IStatisticsGraphical, IStatisticData, RecordType } from "../types"

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

const PRIMARY_GREEN: [number, number, number] = [0, 102, 76]
const HEADER_TEXT: [number, number, number] = [255, 255, 255]
const ALT_ROW: [number, number, number] = [232, 247, 243]

const CATEGORY_LABELS: Record<string, string> = {
  registros: "Registros Científicos",
  grupos: "Grupos de Investigación",
  proyectos: "Proyectos de Investigación",
}

const VIEW_LABELS: Record<string, string> = {
  tabular: "Tabla",
  graphical: "Gráficos",
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  articulo: "Artículo",
  libro: "Libro",
  monografia: "Monografía",
  norma: "Norma",
  patente: "Patente",
  premio: "Premio",
  software: "Software",
  tesis: "Tesis",
  encuentro: "Encuentro",
}

export type RecordStatsForExport = Record<string, { total: number; inFaculty: number }>

function totalFacultadRegistros(registros: IStatisticsTabular["registros"]): number {
  return (Object.keys(registros.porTipo || {}) as RecordType[]).reduce((acc, tipo) => {
    const total = registros.porTipo[tipo] ?? 0
    const p = registros.porcentajeAportePorTipo?.[tipo] ?? 0
    return acc + Math.round((total * p) / 100)
  }, 0)
}

const formatRecordTypeLabel = (tipo: string): string =>
  RECORD_TYPE_LABELS[tipo] ?? tipo.charAt(0).toUpperCase() + tipo.slice(1)

const defaultTableOptions = {
  theme: "grid" as const,
  styles: {
    fontSize: 9,
    cellPadding: 3,
    overflow: "linebreak" as const,
    valign: "middle" as const,
  },
  headStyles: {
    fillColor: PRIMARY_GREEN,
    textColor: HEADER_TEXT,
    fontStyle: "bold" as const,
    halign: "center" as const,
  },
  alternateRowStyles: {
    fillColor: ALT_ROW,
  },
  margin: { left: 14, right: 14 },
}

type PdfDoc = InstanceType<typeof jsPDF>

const addSectionTitle = (doc: PdfDoc, title: string, y: number): number => {
  doc.setFontSize(12)
  doc.setTextColor(0, 102, 76)
  doc.setFont("helvetica", "bold")
  doc.text(title, 14, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(40, 40, 40)
  return y + 6
}

const getLastTableY = (doc: PdfDoc): number => {
  const last = (doc as PdfDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable
  return last?.finalY ?? 20
}

export interface StatisticsPdfChartOptions {
  selectedYear: number
  selectedFacultad: string
  groupVisualizationType: "porFacultad" | "masIntegrantes"
  projectVisualizationType: "porFacultad" | "porEstado"
}

export interface StatisticsPdfBundle {
  tabular: IStatisticsTabular | null
  graphical: IStatisticsGraphical | null
}

const truncateLabel = (text: string, maxLen = 16): string =>
  text.length > maxLen ? `${text.slice(0, maxLen)}…` : text

const drawVerticalBarChart = (
  doc: PdfDoc,
  pageWidth: number,
  startY: number,
  title: string,
  items: { label: string; value: number }[],
  barColor: [number, number, number] = [107, 143, 163],
): number => {
  if (items.length === 0) return startY

  const margin = 14
  const chartW = pageWidth - margin * 2
  const chartH = 58
  let y = addSectionTitle(doc, title, startY + 2)

  const plotBottom = y + chartH - 10
  const plotTop = y + 8
  const plotH = plotBottom - plotTop
  const plotLeft = margin + 6
  const plotW = chartW - 12

  const maxVal = Math.max(...items.map((i) => i.value), 1)
  const barWidth = Math.min(16, (plotW / items.length) * 0.6)
  const gap = Math.max(2, (plotW - barWidth * items.length) / (items.length + 1))

  doc.setDrawColor(190, 190, 190)
  doc.setLineWidth(0.2)
  doc.line(plotLeft, plotBottom, plotLeft + plotW, plotBottom)

  items.forEach((item, idx) => {
    const barH = Math.max(0.5, (item.value / maxVal) * plotH)
    const x = plotLeft + gap + idx * (barWidth + gap)
    const yBar = plotBottom - barH

    doc.setFillColor(...barColor)
    doc.rect(x, yBar, barWidth, barH, "F")

    doc.setFontSize(7)
    doc.setTextColor(50, 50, 50)
    doc.text(truncateLabel(item.label, 12), x + barWidth / 2, plotBottom + 4, {
      align: "center",
    })
    if (item.value > 0) {
      doc.text(String(item.value), x + barWidth / 2, yBar - 2, { align: "center" })
    }
  })

  doc.setTextColor(40, 40, 40)
  return plotBottom + 12
}

const drawHorizontalBarChart = (
  doc: PdfDoc,
  pageWidth: number,
  startY: number,
  title: string,
  items: { label: string; value: number }[],
  barColor: [number, number, number] = [125, 107, 145],
): number => {
  if (items.length === 0) return startY

  const margin = 14
  const chartW = pageWidth - margin * 2
  const rowH = 7
  const chartH = Math.min(90, items.length * rowH + 14)
  let y = addSectionTitle(doc, title, startY + 2)

  const labelW = 52
  const plotLeft = margin + labelW
  const plotW = chartW - labelW - 8
  const maxVal = Math.max(...items.map((i) => i.value), 1)

  items.forEach((item, idx) => {
    const rowY = y + 6 + idx * rowH
    const barW = Math.max(1, (item.value / maxVal) * plotW)

    doc.setFontSize(7)
    doc.setTextColor(50, 50, 50)
    doc.text(truncateLabel(item.label, 22), margin, rowY + 4)

    doc.setFillColor(...barColor)
    doc.rect(plotLeft, rowY, barW, rowH - 2, "F")

    doc.text(String(item.value), plotLeft + barW + 2, rowY + 4)
  })

  doc.setTextColor(40, 40, 40)
  return y + chartH + 4
}

const addTable = (
  doc: PdfDoc,
  startY: number,
  head: string[][],
  body: (string | number)[][],
  columnStyles?: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number | "auto" }>,
) => {
  const totalRowIndex = body.findIndex((row) => String(row[0]).toUpperCase() === "TOTAL")

  autoTable(doc, {
    ...defaultTableOptions,
    startY,
    head,
    body,
    columnStyles,
    didParseCell: (cellData) => {
      if (
        cellData.section === "body" &&
        totalRowIndex >= 0 &&
        cellData.row.index === totalRowIndex
      ) {
        cellData.cell.styles.fontStyle = "bold"
        cellData.cell.styles.fillColor = [200, 230, 220]
      }
    },
  })
  return getLastTableY(doc) + 10
}

export const buildStatisticsPdfBlob = (
  data: IStatisticsTabular | IStatisticsGraphical | StatisticsPdfBundle | null,
  fecha: string,
  category?: "registros" | "grupos" | "proyectos",
  view?: "tabular" | "graphical",
  recordStats?: RecordStatsForExport,
  chartOptions?: StatisticsPdfChartOptions,
): Blob => {
  const bundle: StatisticsPdfBundle =
    data && typeof data === "object" && "tabular" in data
      ? (data as StatisticsPdfBundle)
      : {
          tabular:
            view === "tabular" && data && "registros" in data
              ? (data as IStatisticsTabular)
              : null,
          graphical:
            view === "graphical" && data
              ? (data as IStatisticsGraphical)
              : null,
        }

  const tabular = bundle.tabular
  const graphical = bundle.graphical
  const year = chartOptions?.selectedYear ?? new Date().getFullYear()

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.setTextColor(0, 102, 76)
  doc.setFont("helvetica", "bold")
  doc.text("Reporte de Estadísticas", pageWidth / 2, 18, { align: "center" })

  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.setFont("helvetica", "normal")
  doc.text(`Fecha de generación: ${fecha}`, 14, 28)
  doc.text(`Categoría: ${category ? CATEGORY_LABELS[category] : "General"}`, 14, 34)
  doc.text(
    `Vista: ${view === "tabular" ? "Tabla y gráfico" : view ? VIEW_LABELS[view] : "General"}`,
    14,
    40,
  )

  let y = 48

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage()
      y = 20
    }
  }

  const addChartBlock = (
    title: string,
    items: { label: string; value: number }[],
    horizontal = false,
    color?: [number, number, number],
  ) => {
    if (items.length === 0) return
    const chartHeight = horizontal ? Math.min(90, items.length * 7 + 20) : 72
    ensureSpace(chartHeight + 8)
    y = horizontal
      ? drawHorizontalBarChart(doc, pageWidth, y, title, items, color)
      : drawVerticalBarChart(doc, pageWidth, y, title, items, color)
  }

  if (view === "tabular" && tabular && category === "registros") {

    if (recordStats && Object.keys(recordStats).length > 0) {
      ensureSpace(30)
      y = addSectionTitle(doc, "Registros Científicos", y)
      const body: (string | number)[][] = Object.entries(recordStats).map(([tipo, stats]) => {
        const aporte = stats.total > 0 ? (stats.inFaculty / stats.total) * 100 : 0
        return [
          formatRecordTypeLabel(tipo),
          stats.total,
          stats.inFaculty,
          `${aporte.toFixed(1)}%`,
        ]
      })
      const totalCentro = Object.values(recordStats).reduce((s, r) => s + r.total, 0)
      const totalFac = Object.values(recordStats).reduce((s, r) => s + r.inFaculty, 0)
      const pctTotal = totalCentro > 0 ? (totalFac / totalCentro) * 100 : 0
      body.push(["TOTAL", totalCentro, totalFac, `${pctTotal.toFixed(1)}%`])

      y = addTable(
        doc,
        y,
        [["Tipo de Registro", "Total del Centro", "Total de la Facultad", "% Aporte"]],
        body,
        {
          0: { halign: "left" },
          1: { halign: "center" },
          2: { halign: "center" },
          3: { halign: "center" },
        },
      )

      const chartItems = Object.entries(recordStats).map(([tipo, stats]) => ({
        label: formatRecordTypeLabel(tipo),
        value: stats.total,
      }))
      addChartBlock("Gráfico — Total de registros por tipo", chartItems, false, [74, 158, 255])
    } else if (tabular.registros) {
      ensureSpace(30)
      y = addSectionTitle(doc, "Registros Científicos", y)
      const body: (string | number)[][] = Object.entries(tabular.registros.porTipo || {}).map(
        ([tipo, total]) => {
          const porcentaje = tabular.registros.porcentajeAportePorTipo?.[tipo as RecordType] ?? 0
          const fac = Math.round((Number(total) * porcentaje) / 100)
          return [formatRecordTypeLabel(tipo), total, fac, `${porcentaje.toFixed(1)}%`]
        },
      )
      const totalRegistros = Object.values(tabular.registros.porTipo || {}).reduce((a, v) => a + v, 0)
      const totalFac = totalFacultadRegistros(tabular.registros)
      const porcentajeTotal = totalRegistros > 0 ? (totalFac / totalRegistros) * 100 : 0
      body.push(["TOTAL", totalRegistros, totalFac, `${porcentajeTotal.toFixed(1)}%`])

      y = addTable(
        doc,
        y,
        [["Tipo de Registro", "Total del Centro", "Total de la Facultad", "% Aporte"]],
        body,
        {
          0: { halign: "left" },
          1: { halign: "center" },
          2: { halign: "center" },
          3: { halign: "center" },
        },
      )

      const chartItems = Object.entries(tabular.registros.porTipo || {}).map(([tipo, total]) => ({
        label: formatRecordTypeLabel(tipo),
        value: Number(total),
      }))
      addChartBlock("Gráfico — Registros por tipo", chartItems, false, [74, 158, 255])
    }
  }

  if (view === "tabular" && tabular && category === "grupos") {
    if (tabular.grupos) {
      ensureSpace(30)
      y = addSectionTitle(doc, "Grupos de Investigación", y)
      const body: (string | number)[][] = Object.entries(tabular.grupos.porFacultad || {}).map(
        ([facultad, cantidad]) => [
          facultad,
          cantidad,
          tabular.grupos.integrantesPorGrupo?.[facultad] ?? 0,
        ],
      )
      const sumInt = Object.values(tabular.grupos.integrantesPorGrupo || {}).reduce((a, v) => a + v, 0)
      body.push(["TOTAL", tabular.grupos.total ?? 0, sumInt])

      y = addTable(
        doc,
        y,
        [["Facultad", "Cantidad de Grupos", "Total de Integrantes"]],
        body,
        {
          0: { halign: "left" },
          1: { halign: "center" },
          2: { halign: "center" },
        },
      )

      const chartItems = Object.entries(tabular.grupos.porFacultad || {}).map(([facultad, cantidad]) => ({
        label: facultad,
        value: Number(cantidad),
      }))
      addChartBlock("Gráfico — Grupos por facultad", chartItems, false, [123, 160, 91])
    }
  }

  if (view === "tabular" && tabular && category === "proyectos") {
    if (tabular.proyectos) {
      ensureSpace(30)
      y = addSectionTitle(doc, "Proyectos de Investigación", y)
      const body: (string | number)[][] = Object.entries(tabular.proyectos.porFacultad || {}).map(
        ([facultad, cantidad]) => [
          facultad,
          cantidad,
          tabular.proyectos.integrantesPorProyecto?.[facultad] ?? 0,
        ],
      )
      const sumI = Object.values(tabular.proyectos.integrantesPorProyecto || {}).reduce(
        (a, v) => a + v,
        0,
      )
      body.push(["TOTAL", tabular.proyectos.total ?? 0, sumI])

      y = addTable(
        doc,
        y,
        [["Facultad", "Cantidad de Proyectos", "Total de Integrantes"]],
        body,
        {
          0: { halign: "left" },
          1: { halign: "center" },
          2: { halign: "center" },
        },
      )

      const chartItems = Object.entries(tabular.proyectos.porFacultad || {}).map(([facultad, cantidad]) => ({
        label: facultad,
        value: Number(cantidad),
      }))
      addChartBlock("Gráfico — Proyectos por facultad", chartItems, false, [107, 143, 163])
    }
  }

  if (view === "graphical" && graphical) {
    const graphicalExt = graphical as IStatisticsGraphical & {
      proyectosPorFacultad?: IStatisticData[]
      proyectosPorEstado?: IStatisticData[]
      registrosPorFacultadEnAño?: Record<string, Record<RecordType, number>>
    }

    if (category === "registros" && graphicalExt.indicadoresRegistrosPorAño) {
      const yearData = graphicalExt.indicadoresRegistrosPorAño[year]
      if (yearData && Object.keys(yearData).length > 0) {
        ensureSpace(30)
        y = addSectionTitle(doc, `Registros por tipo — Año ${year}`, y)
        const body = Object.entries(yearData).map(([tipo, total]) => [
          formatRecordTypeLabel(tipo),
          total,
        ])
        y = addTable(doc, y, [["Tipo de Registro", "Cantidad"]], body)
        addChartBlock(
          `Gráfico — Registros por tipo (año ${year})`,
          Object.entries(yearData).map(([tipo, total]) => ({
            label: formatRecordTypeLabel(tipo),
            value: Number(total),
          })),
          false,
          [74, 158, 255],
        )
      }
    }

    if (category === "grupos") {
      const showPorFacultad =
        chartOptions?.groupVisualizationType !== "masIntegrantes"
      const showMasIntegrantes =
        chartOptions?.groupVisualizationType === "masIntegrantes"

      if (showPorFacultad && graphical.gruposPorFacultad?.length) {
        ensureSpace(30)
        y = addSectionTitle(doc, "Grupos por Facultad", y)
        y = addTable(
          doc,
          y,
          [["Facultad", "Cantidad"]],
          graphical.gruposPorFacultad.map((item) => [item.label, item.value]),
        )
        addChartBlock(
          "Gráfico — Grupos por facultad",
          graphical.gruposPorFacultad.map((item) => ({
            label: item.label,
            value: item.value,
          })),
          false,
          [123, 160, 91],
        )
      }
      if (showMasIntegrantes && graphical.gruposConMasEstudiantes?.length) {
        ensureSpace(30)
        y = addSectionTitle(doc, "Grupos con Más Integrantes", y)
        y = addTable(
          doc,
          y,
          [["Grupo", "Integrantes"]],
          graphical.gruposConMasEstudiantes.map((item) => [item.label, item.value]),
        )
        addChartBlock(
          "Gráfico — Grupos con más integrantes",
          graphical.gruposConMasEstudiantes.map((item) => ({
            label: item.label,
            value: item.value,
          })),
          true,
          [125, 107, 145],
        )
      }
    }

    if (category === "proyectos") {
      const ext = graphicalExt as IStatisticsGraphical & {
        proyectosPorFacultad?: IStatisticData[]
        proyectosPorEstado?: IStatisticData[]
      }
      const showPorFacultad =
        chartOptions?.projectVisualizationType !== "porEstado"
      const showPorEstado = chartOptions?.projectVisualizationType === "porEstado"

      if (showPorFacultad && ext.proyectosPorFacultad?.length) {
        ensureSpace(30)
        y = addSectionTitle(doc, `Proyectos por Facultad — Año ${year}`, y)
        y = addTable(
          doc,
          y,
          [["Facultad", "Cantidad"]],
          ext.proyectosPorFacultad.map((item) => [item.label, item.value]),
        )
        addChartBlock(
          "Gráfico — Proyectos por facultad",
          ext.proyectosPorFacultad.map((item) => ({
            label: item.label,
            value: item.value,
          })),
          false,
          [107, 143, 163],
        )
      }
      if (showPorEstado && ext.proyectosPorEstado?.length) {
        ensureSpace(30)
        y = addSectionTitle(doc, "Proyectos por Estado", y)
        y = addTable(
          doc,
          y,
          [["Estado", "Cantidad"]],
          ext.proyectosPorEstado.map((item) => [item.label, item.value]),
        )
        addChartBlock(
          "Gráfico — Proyectos por estado",
          ext.proyectosPorEstado.map((item) => ({
            label: item.label,
            value: item.value,
          })),
          false,
          [107, 143, 163],
        )
      }
    }
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: "right" })
  }

  return doc.output("blob")
}

function workbookToXlsxBlob(wb: XLSX.WorkBook): Blob {
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" })
  return new Blob([buf], { type: XLSX_MIME })
}

export const buildEmptyXlsxInfoBlob = (): Blob => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    [
      "Para exportar a Excel con tablas, seleccione «Ver tabla» y luego use «Exportar XLSX».",
    ],
  ])
  XLSX.utils.book_append_sheet(wb, ws, "Información")
  return workbookToXlsxBlob(wb)
}

export const buildTabularStatisticsXlsxBlob = (
  data: IStatisticsTabular,
  fecha: string,
  category: "registros" | "grupos" | "proyectos" | undefined,
  view: "tabular" | "graphical" | undefined,
  recordStats?: RecordStatsForExport,
): Blob => {
  const rows: (string | number)[][] = [
    ["Reporte de Estadísticas"],
    ["Fecha de generación", fecha],
    ["Categoría", category ? CATEGORY_LABELS[category] : "General"],
    ["Vista", view ? VIEW_LABELS[view] : "General"],
    [],
  ]

  if (category === "registros" && recordStats && Object.keys(recordStats).length > 0) {
    rows.push(["REGISTROS CIENTÍFICOS"])
    rows.push(["Tipo", "Total del Centro", "Total de la Facultad", "% Aporte"])
    Object.entries(recordStats).forEach(([tipo, stats]) => {
      const aporte = stats.total > 0 ? (stats.inFaculty / stats.total) * 100 : 0
      rows.push([
        formatRecordTypeLabel(tipo),
        stats.total,
        stats.inFaculty,
        `${aporte.toFixed(1)}%`,
      ])
    })
    const totalR = Object.values(recordStats).reduce((a, s) => a + s.total, 0)
    const totalF = Object.values(recordStats).reduce((a, s) => a + s.inFaculty, 0)
    const pTot = totalR > 0 ? (totalF / totalR) * 100 : 0
    rows.push(["TOTAL", totalR, totalF, `${pTot.toFixed(1)}%`])
    rows.push([])
  } else if (category === "registros" && data.registros) {
    rows.push(["REGISTROS CIENTÍFICOS"])
    rows.push(["Tipo", "Total del Centro", "Total de la Facultad", "% Aporte"])
    Object.entries(data.registros.porTipo || {}).forEach(([tipo, total]) => {
      const p = data.registros.porcentajeAportePorTipo?.[tipo as RecordType] ?? 0
      const tf = Math.round((Number(total) * p) / 100)
      rows.push([formatRecordTypeLabel(tipo), total, tf, `${p.toFixed(1)}%`])
    })
    const totalR = Object.values(data.registros.porTipo || {}).reduce((a, v) => a + v, 0)
    const totalF = totalFacultadRegistros(data.registros)
    const pTot = totalR > 0 ? (totalF / totalR) * 100 : 0
    rows.push(["TOTAL", totalR, totalF, `${pTot.toFixed(1)}%`])
    rows.push([])
  }

  if (category === "grupos" && data.grupos) {
    rows.push(["GRUPOS DE INVESTIGACIÓN"])
    rows.push(["Facultad", "Cantidad de Grupos", "Integrantes (por facultad)"])
    Object.entries(data.grupos.porFacultad || {}).forEach(([fac, cnt]) => {
      const integ = data.grupos.integrantesPorGrupo?.[fac] ?? 0
      rows.push([fac, cnt, integ])
    })
    const sumI = Object.values(data.grupos.integrantesPorGrupo || {}).reduce((a, b) => a + b, 0)
    rows.push(["TOTAL", data.grupos.total ?? 0, sumI])
    rows.push([])
  }

  if (category === "proyectos" && data.proyectos) {
    rows.push(["PROYECTOS DE INVESTIGACIÓN"])
    rows.push(["Facultad", "Cantidad de Proyectos", "Integrantes (por facultad)"])
    Object.entries(data.proyectos.porFacultad || {}).forEach(([fac, cnt]) => {
      const integ = data.proyectos.integrantesPorProyecto?.[fac] ?? 0
      rows.push([fac, cnt, integ])
    })
    const sumP = Object.values(data.proyectos.integrantesPorProyecto || {}).reduce((a, b) => a + b, 0)
    rows.push(["TOTAL", data.proyectos.total ?? 0, sumP])
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!cols"] = [{ wch: 32 }, { wch: 22 }, { wch: 28 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws, "Estadísticas")
  return workbookToXlsxBlob(wb)
}
