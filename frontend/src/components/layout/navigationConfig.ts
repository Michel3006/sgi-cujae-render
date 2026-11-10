export type BreadcrumbItem = {
  label: string
  path?: string
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  groups: "Grupos",
  projects: "Proyectos",
  records: "Registros",
  users: "Usuarios",
  audit: "Bitácora",
  statistics: "Estadísticas",
  assistant: "Asistente",
  new: "Nuevo",
  edit: "Editar",
}

const SECTION_TITLES: Record<string, string> = {
  dashboard: "Panel principal",
  groups: "Grupos de investigación",
  projects: "Proyectos de investigación",
  records: "Registros científicos",
  users: "Gestión de usuarios",
  audit: "Bitácora del sistema",
  statistics: "Estadísticas",
  assistant: "Asistente virtual",
}

const NEW_SECTION_TITLES: Record<string, string> = {
  groups: "Nuevo grupo de investigación",
  projects: "Nuevo proyecto de investigación",
  records: "Nuevo registro científico",
}

const EDIT_SECTION_TITLES: Record<string, string> = {
  groups: "Editar grupo de investigación",
  projects: "Editar proyecto de investigación",
  records: "Editar registro científico",
}

const DETAIL_SECTION_TITLES: Record<string, string> = {
  groups: "Detalle del grupo",
  projects: "Detalle del proyecto",
  records: "Detalle del registro",
}

const isEntityIdSegment = (segment: string, parent?: string): boolean => {
  if (!parent) return false
  if (/^\d+$/.test(segment)) return true
  if (parent === "records" && segment.includes("-")) return true
  return false
}

export const buildBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: BreadcrumbItem[] = [{ label: "Inicio", path: "/dashboard" }]

  if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) {
    crumbs.push({ label: "Dashboard" })
    return crumbs
  }

  let accumulated = ""

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const parent = segments[index - 1]
    accumulated += `/${segment}`

    if (segment === "dashboard") {
      crumbs.push({ label: "Dashboard", path: accumulated })
      continue
    }

    if (segment === "edit") {
      crumbs.push({ label: SEGMENT_LABELS.edit })
      continue
    }

    if (segment === "new") {
      crumbs.push({ label: SEGMENT_LABELS.new })
      continue
    }

    if (isEntityIdSegment(segment, parent)) {
      const isLast = index === segments.length - 1
      const next = segments[index + 1]
      if (next === "edit") {
        crumbs.push({ label: "Detalle", path: accumulated })
      } else if (isLast) {
        crumbs.push({ label: "Detalle" })
      } else {
        crumbs.push({ label: "Detalle", path: accumulated })
      }
      continue
    }

    const label = SEGMENT_LABELS[segment] ?? segment
    const isLast = index === segments.length - 1
    crumbs.push(isLast ? { label } : { label, path: accumulated })
  }

  return crumbs
}

export const getSectionTitle = (pathname: string): string => {
  const segments = pathname.split("/").filter(Boolean)
  const root = segments[0]
  if (!root) return "Sistema de Gestión de Investigación"

  const base = SECTION_TITLES[root] ?? "Sistema de Gestión de Investigación"
  const last = segments[segments.length - 1]
  const parent = segments[segments.length - 2]

  if (last === "new") {
    return NEW_SECTION_TITLES[root] ?? base
  }

  if (last === "edit" && parent && isEntityIdSegment(parent, root)) {
    return EDIT_SECTION_TITLES[root] ?? base
  }

  if (segments.length === 2 && isEntityIdSegment(last, root)) {
    return DETAIL_SECTION_TITLES[root] ?? base
  }

  return base
}

export const getActiveNavPath = (pathname: string): string => {
  const root = pathname.split("/").filter(Boolean)[0]
  if (!root) return "/dashboard"
  return `/${root}`
}
