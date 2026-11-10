import type { RecordType } from "../types/record/types"
import type {
  ArticlePayload,
  BookPayload,
  MonographPayload,
  NormPayload,
  PatentPayload,
  SoftwarePayload,
  EventPayload,
  PrizePayload,
  ThesisPayload,
} from "../types/record/types"

export type RecordFormPayloadSource = {
  titulo: string
  tituloCapitulo: string
  resumen: string
  palabrasClave: string
  año: number | string
  mes: number | string
  revista: string
  volumen: string
  paginas: string
  numero: string
  doi: string
  issn: string
  editorial: string
  isbn: string
  numeroRegistro: string
  estado: string
  registroCENDA: string
  nombreEvento: string
  organizador: string
  institucion: string
  tipoArticulo: string
  tipoNorma: string
  tipoPremio: string
  tipoTesis: string
  tipoEvento: string
}

export type RecordPayloadContext = {
  formData: RecordFormPayloadSource
  authorIds: number[]
  tutorIds?: number[]
  selectedCountryId: number | null
  selectedArticleTypeId: number | null
  selectedNormTypeId: number | null
  selectedPrizeTypeId: number | null
  selectedThesisTypeId: number | null
  selectedEncounterTypeId: number | null
  id_group: number | null
  id_project: number | null
  includeDoi?: boolean
}

const toNullIfEmpty = (value: string | null | undefined): string | null =>
  value && value.trim() ? value.trim() : null

const toBoolean = (value: string | boolean | undefined): boolean => {
  if (typeof value === "boolean") return value
  if (!value) return false
  const normalized = value.toLowerCase()
  return normalized === "concedida" || normalized === "registrado" || normalized === "true" || normalized === "si"
}

export const parseMonthYear = (mes: number | string, año: number | string) => ({
  month_only: parseInt(String(mes), 10) || 1,
  year_only: parseInt(String(año), 10) || new Date().getFullYear(),
})

export const formatOnlyDate = (mes: number | string, año: number | string): string => {
  const { month_only, year_only } = parseMonthYear(mes, año)
  return `${year_only}-${String(month_only).padStart(2, "0")}-01`
}

const commonFields = (ctx: RecordPayloadContext) => {
  const { month_only, year_only } = parseMonthYear(ctx.formData.mes, ctx.formData.año)
  const reportDate = new Date().toISOString().split("T")[0]

  return {
    keywords: toNullIfEmpty(ctx.formData.palabrasClave),
    resume: toNullIfEmpty(ctx.formData.resumen),
    report_date: reportDate,
    id_country: ctx.selectedCountryId,
    month_only,
    year_only,
    id_group: ctx.id_group,
    id_project: ctx.id_project,
    only_date: formatOnlyDate(ctx.formData.mes, ctx.formData.año),
  }
}

export const buildArticlePayload = (
  ctx: RecordPayloadContext,
  mode: "create" | "update",
): ArticlePayload => {
  const base = {
    title: ctx.formData.titulo,
    journal: ctx.formData.revista,
    voulume: ctx.formData.volumen || "",
    pages: ctx.formData.paginas || "",
    number: toNullIfEmpty(ctx.formData.numero),
    id_article_type: ctx.selectedArticleTypeId,
    issn: toNullIfEmpty(ctx.formData.issn),
    author_ids: ctx.authorIds,
    ...commonFields(ctx),
  }

  if (mode === "create") {
    return {
      ...base,
      doi: toNullIfEmpty(ctx.formData.doi),
      published: true,
    }
  }

  return {
    ...base,
    published: true,
    ...(ctx.includeDoi !== false ? { doi: toNullIfEmpty(ctx.formData.doi) } : {}),
  }
}

export const buildBookPayload = (ctx: RecordPayloadContext): BookPayload => {
  const publisher = toNullIfEmpty(ctx.formData.editorial)

  return {
    title: ctx.formData.titulo,
    chapter_title: ctx.formData.tituloCapitulo || "",
    editor: null,
    voulume: ctx.formData.volumen || "",
    number: toNullIfEmpty(ctx.formData.numero),
    series: null,
    pages: toNullIfEmpty(ctx.formData.paginas),
    publisher,
    isbn: toNullIfEmpty(ctx.formData.isbn),
    is_chapter: false,
    author_ids: ctx.authorIds,
    ...commonFields(ctx),
  }
}

export const buildMonographPayload = (ctx: RecordPayloadContext): MonographPayload => ({
  title: ctx.formData.titulo,
  isbn: ctx.formData.isbn || "",
  pages: ctx.formData.paginas || "",
  number: toNullIfEmpty(ctx.formData.numero),
  month: toNullIfEmpty(String(ctx.formData.mes)),
  cenda: ctx.formData.registroCENDA || "",
  author_ids: ctx.authorIds,
  ...commonFields(ctx),
})

export const buildNormPayload = (ctx: RecordPayloadContext): NormPayload => ({
  title: ctx.formData.titulo,
  registration_number: ctx.formData.numeroRegistro || "",
  pages: ctx.formData.paginas || "",
  id_norm_type: ctx.selectedNormTypeId,
  author_ids: ctx.authorIds,
  ...commonFields(ctx),
})

export const buildPatentPayload = (ctx: RecordPayloadContext): PatentPayload => ({
  title: ctx.formData.titulo,
  reg_number: ctx.formData.numeroRegistro || "",
  yearfiled: String(parseMonthYear(ctx.formData.mes, ctx.formData.año).year_only),
  language: null,
  assignee: "",
  monthfield: toNullIfEmpty(String(ctx.formData.mes)),
  is_conceded: toBoolean(ctx.formData.estado),
  author_ids: ctx.authorIds,
  ...commonFields(ctx),
})

export const buildSoftwarePayload = (ctx: RecordPayloadContext): SoftwarePayload => ({
  title: ctx.formData.titulo,
  number: ctx.formData.registroCENDA || "",
  yearfiled: String(parseMonthYear(ctx.formData.mes, ctx.formData.año).year_only),
  language: null,
  assignee: "",
  monthfield: toNullIfEmpty(String(ctx.formData.mes)),
  is_conceded: toBoolean(ctx.formData.estado),
  is_multimedia: false,
  author_ids: ctx.authorIds,
  ...commonFields(ctx),
})

export const buildEventPayload = (ctx: RecordPayloadContext): EventPayload => ({
  title: ctx.formData.titulo,
  encounter_name: ctx.formData.nombreEvento || "",
  id_encounter_type: ctx.selectedEncounterTypeId,
  organizer: ctx.formData.organizador || "",
  isbn: null,
  city: null,
  issn: null,
  author_ids: ctx.authorIds,
  ...commonFields(ctx),
})

export const buildPrizePayload = (ctx: RecordPayloadContext): PrizePayload => ({
  title: ctx.formData.titulo,
  grant_institution: ctx.formData.institucion || "",
  id_prize_type: ctx.selectedPrizeTypeId,
  author_ids: ctx.authorIds,
  ...commonFields(ctx),
})

export const buildThesisPayload = (ctx: RecordPayloadContext): ThesisPayload => ({
  title: ctx.formData.titulo,
  institution: ctx.formData.institucion || "",
  id_thesis_type: ctx.selectedThesisTypeId,
  author_ids: ctx.authorIds,
  tutor_ids: ctx.tutorIds ?? [],
  ...commonFields(ctx),
})

export type ResolvedTypeIds = {
  selectedArticleTypeId: number | null
  selectedNormTypeId: number | null
  selectedPrizeTypeId: number | null
  selectedThesisTypeId: number | null
  selectedEncounterTypeId: number | null
}

export const resolveTypeIds = (
  recordType: RecordType,
  formData: RecordFormPayloadSource,
  ids: ResolvedTypeIds,
  catalogs: {
    articleTypes: { id: number; name: string }[]
    normTypes: { id: number; name: string }[]
    prizeTypes: { id: number; name: string }[]
    thesisTypes: { id: number; name: string }[]
    encounterTypes: { id: number; name: string }[]
  },
): ResolvedTypeIds => {
  const byName = (list: { id: number; name: string }[], name: string) =>
    list.find((item) => item.name.toLowerCase() === name.trim().toLowerCase())?.id ?? null

  return {
    selectedArticleTypeId:
      recordType === "articulo"
        ? ids.selectedArticleTypeId ?? byName(catalogs.articleTypes, formData.tipoArticulo)
        : ids.selectedArticleTypeId,
    selectedNormTypeId:
      recordType === "norma"
        ? ids.selectedNormTypeId ?? byName(catalogs.normTypes, formData.tipoNorma)
        : ids.selectedNormTypeId,
    selectedPrizeTypeId:
      recordType === "premio"
        ? ids.selectedPrizeTypeId ?? byName(catalogs.prizeTypes, formData.tipoPremio)
        : ids.selectedPrizeTypeId,
    selectedThesisTypeId:
      recordType === "tesis"
        ? ids.selectedThesisTypeId ?? byName(catalogs.thesisTypes, formData.tipoTesis)
        : ids.selectedThesisTypeId,
    selectedEncounterTypeId:
      recordType === "evento"
        ? ids.selectedEncounterTypeId ?? byName(catalogs.encounterTypes, formData.tipoEvento)
        : ids.selectedEncounterTypeId,
  }
}
