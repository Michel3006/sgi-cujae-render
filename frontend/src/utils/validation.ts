/**
 * Utilidades de validación para formularios
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Valida que un campo no esté vacío
 */
export const validateRequired = (value: string | number | null | undefined, fieldName: string): string | null => {
  if (value === null || value === undefined || value === "") {
    return `${fieldName} es requerido`
  }
  if (typeof value === "string" && value.trim() === "") {
    return `${fieldName} no puede estar vacío`
  }
  return null
}

/**
 * Valida formato de email
 */
export const validateEmail = (email: string | null | undefined): string | null => {
  if (!email || email.trim() === "") return null // Email es opcional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return "El formato del email no es válido"
  }
  return null
}

/**
 * Valida correo obligatorio (contacto externo, inicio de sesión, etc.)
 */
export const validateEmailRequired = (
  email: string | null | undefined,
  fieldName = "El correo electrónico",
): string | null => {
  const requiredError = validateRequired(
    typeof email === "string" ? email.trim() : email ?? "",
    fieldName,
  )
  if (requiredError) return requiredError
  return validateEmail(email)
}

/**
 * Valida número de teléfono (internacional simple o local).
 * Acepta +, espacios, guiones; entre 7 y 15 dígitos.
 */
export const validatePhone = (phone: string | null | undefined, required = false): string | null => {
  if (!phone || phone.trim() === '') {
    return required ? 'El teléfono es requerido' : null
  }
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) {
    return 'El teléfono debe tener entre 7 y 15 dígitos'
  }
  if (!/^[\d\s+\-().]+$/.test(phone.trim())) {
    return 'El teléfono contiene caracteres no permitidos'
  }
  return null
}

/**
 * Valida nombre obligatorio (sin números ni caracteres especiales).
 */
export const validateNameRequired = (
  name: string | null | undefined,
  fieldName: string,
): string | null => {
  const requiredError = validateRequired(name, fieldName)
  if (requiredError) return requiredError
  return validateName(name, fieldName)
}

/**
 * Normaliza ISSN al formato XXXX-XXXX para mostrar/guardar.
 */
export const formatISSN = (issn: string): string => {
  const clean = issn.replace(/[-\s]/g, '').toUpperCase()
  if (clean.length !== 8) return issn.trim()
  return `${clean.slice(0, 4)}-${clean.slice(4)}`
}

/**
 * Normaliza ISBN eliminando espacios/guiones extra.
 */
export const formatISBN = (isbn: string): string => isbn.replace(/[\s-]/g, '').toUpperCase()

/**
 * Valida formato de DOI (10.xxxx/xxxxx)
 */
export const validateDOI = (doi: string | null | undefined): string | null => {
  if (!doi || doi.trim() === '') return null
  const doiRegex = /^10\.\d{4,}\/[\S]+$/
  if (!doiRegex.test(doi.trim())) {
    return 'El formato del DOI no es válido (debe ser: 10.xxxx/xxxxx)'
  }
  return null
}

/**
 * Valida DOI normalizando prefijos doi.org
 */
export const validateDOINormalized = (doi: string | null | undefined): string | null => {
  if (!doi || doi.trim() === '') return null
  let normalized = doi.trim()
  normalized = normalized.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  normalized = normalized.replace(/^doi:\s*/i, '')
  return validateDOI(normalized)
}

/**
 * Valida formato de ISSN (XXXX-XXXX)
 */
export const validateISSN = (issn: string | null | undefined): string | null => {
  if (!issn || issn.trim() === "") return null // ISSN es opcional
  // Remover guiones y espacios para validar
  const cleanISSN = issn.replace(/[-\s]/g, "")
  if (cleanISSN.length !== 8 || !/^\d{7}[\dX]$/.test(cleanISSN)) {
    return "El formato del ISSN no es válido (debe ser: XXXX-XXXX)"
  }
  return null
}

/**
 * Valida formato de ISBN (puede ser ISBN-10 o ISBN-13)
 */
export const validateISBN = (isbn: string | null | undefined): string | null => {
  if (!isbn || isbn.trim() === "") return null // ISBN es opcional
  // Remover guiones y espacios para validar
  const cleanISBN = isbn.replace(/[-\s]/g, "")
  // ISBN-10: 10 dígitos, ISBN-13: 13 dígitos
  if (cleanISBN.length === 10 && /^\d{9}[\dX]$/.test(cleanISBN)) {
    return null
  }
  if (cleanISBN.length === 13 && /^\d{13}$/.test(cleanISBN)) {
    return null
  }
  return "El formato del ISBN no es válido (debe ser ISBN-10 o ISBN-13)"
}

/**
 * Valida que el año sea razonable (entre 1900 y año actual + 1)
 */
export const validateYear = (year: number | null | undefined): string | null => {
  if (!year) return "El año es requerido"
  const currentYear = new Date().getFullYear()
  if (year < 1900 || year > currentYear + 1) {
    return `El año debe estar entre 1900 y ${currentYear + 1}`
  }
  return null
}

/**
 * Valida que la fecha de inicio no sea mayor que la fecha de fin
 */
export const validateDateRange = (
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
): string | null => {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (start > end) {
    return "La fecha de inicio no puede ser mayor que la fecha de fin"
  }
  return null
}

/**
 * Valida que haya al menos un autor
 */
export const validateAuthors = (authors: any[]): string | null => {
  if (!authors || authors.length === 0) {
    return "Debe haber al menos un autor"
  }
  return null
}

type ThesisPersonRef = {
  integrantId?: number | null
  nombre?: string | null
  apellidos?: string | null
  usuario?: {
    nombre?: string | null
    apellidos?: string | null
    correoElectronico?: string | null
    numeroIdentidad?: string | null
    id_country?: number | null
  }
}

export const formatThesisPersonLabel = (person: ThesisPersonRef): string => {
  const nombre = person.nombre?.trim() || person.usuario?.nombre?.trim() || ""
  const apellidos = person.apellidos?.trim() || person.usuario?.apellidos?.trim() || ""
  const fullName = `${nombre} ${apellidos}`.trim()
  return fullName || "Esta persona"
}

/**
 * Mensaje cuando se intenta agregar un rol incompatible en una tesis.
 */
export const buildThesisRoleConflictMessage = (
  personLabel: string,
  roleBeingAdded: "author" | "tutor",
): string => {
  const existingRole = roleBeingAdded === "author" ? "tutor" : "autor"
  const newRole = roleBeingAdded === "author" ? "autor" : "tutor"
  return `"${personLabel}" ya está registrado como ${existingRole} de la tesis. No puede agregarse también como ${newRole}.`
}

const normalizeThesisPersonEmail = (email?: string | null): string =>
  email?.trim().toLowerCase() ?? ""

const buildThesisExternalPersonKey = (person: ThesisPersonRef): string | null => {
  const email = normalizeThesisPersonEmail(person.usuario?.correoElectronico)
  if (email) return `email:${email}`

  const identity = person.usuario?.numeroIdentidad?.trim()
  const countryId = person.usuario?.id_country
  if (identity && countryId != null) {
    return `id:${countryId}:${identity.toLowerCase()}`
  }

  return null
}

/**
 * Valida que ningún tutor de tesis figure también como autor.
 */
export const validateThesisAuthorsNotTutors = (
  authors: ThesisPersonRef[],
  tutors: ThesisPersonRef[],
  options?: { roleBeingAdded?: "author" | "tutor" },
): string | null => {
  const roleBeingAdded = options?.roleBeingAdded

  for (const tutor of tutors) {
    if (tutor.integrantId == null) continue
    const isAlsoAuthor = authors.some((author) => author.integrantId === tutor.integrantId)
    if (!isAlsoAuthor) continue
    return buildThesisRoleConflictMessage(
      formatThesisPersonLabel(tutor),
      roleBeingAdded ?? "tutor",
    )
  }

  for (const author of authors) {
    if (author.integrantId == null) continue
    const isAlsoTutor = tutors.some((tutor) => tutor.integrantId === author.integrantId)
    if (!isAlsoTutor) continue
    return buildThesisRoleConflictMessage(
      formatThesisPersonLabel(author),
      roleBeingAdded ?? "author",
    )
  }

  for (const author of authors) {
    if (author.integrantId != null) continue
    const authorKey = buildThesisExternalPersonKey(author)
    if (!authorKey) continue

    const matchingTutor = tutors.find(
      (tutor) =>
        tutor.integrantId == null && buildThesisExternalPersonKey(tutor) === authorKey,
    )
    if (!matchingTutor) continue

    return buildThesisRoleConflictMessage(
      formatThesisPersonLabel(author),
      roleBeingAdded ?? "author",
    )
  }

  return null
}

/**
 * Valida palabras clave (mínimo 3, máximo 10)
 */
export const validateKeywords = (keywords: string | null | undefined): string | null => {
  if (!keywords || keywords.trim() === "") return null // Palabras clave son opcionales
  const keywordArray = keywords.split(",").map((k) => k.trim()).filter((k) => k !== "")
  if (keywordArray.length < 3) {
    return "Debe haber al menos 3 palabras clave"
  }
  if (keywordArray.length > 10) {
    return "No puede haber más de 10 palabras clave"
  }
  return null
}

/**
 * Valida que un nombre no contenga números ni caracteres especiales
 */
export const validateName = (name: string | null | undefined, fieldName: string): string | null => {
  if (!name || name.trim() === "") return null // Nombre puede ser opcional dependiendo del contexto
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/
  if (!nameRegex.test(name.trim())) {
    return `${fieldName} no puede contener números ni caracteres especiales`
  }
  return null
}

/**
 * Valida longitud de texto
 */
export const validateLength = (
  value: string | null | undefined,
  min: number,
  max: number,
  fieldName: string,
): string | null => {
  if (!value) return null
  const length = value.trim().length
  if (length < min) {
    return `${fieldName} debe tener al menos ${min} caracteres`
  }
  if (length > max) {
    return `${fieldName} no puede tener más de ${max} caracteres`
  }
  return null
}

/**
 * Valida que las páginas iniciales sean menores que las finales
 */
export const validatePages = (startPage: string | null | undefined, endPage: string | null | undefined): string | null => {
  if (!startPage || !endPage) return null
  const start = parseInt(startPage)
  const end = parseInt(endPage)
  if (isNaN(start) || isNaN(end)) return null
  if (start >= end) {
    return "La página inicial debe ser menor que la página final"
  }
  return null
}

/**
 * Extrae el mensaje de error de una respuesta HTTP
 */
export const extractErrorMessage = (error: any): string => {
  const data = error?.response?.data
  if (data?.detail != null) {
    if (typeof data.detail === "string") return data.detail
    if (Array.isArray(data.detail)) {
      const parts = data.detail.map((item: unknown) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          return String((item as { msg?: string }).msg ?? JSON.stringify(item))
        }
        return typeof item === "string" ? item : JSON.stringify(item)
      })
      return parts.join("; ") || "Ocurrió un error inesperado"
    }
  }
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message
  }
  if (error?.message) {
    return error.message
  }
  return "Ocurrió un error inesperado"
}

/**
 * Detecta si el error es un 409 (conflicto) relacionado con ISSN/ISBN/DOI duplicado
 */
export const isDuplicateIdentifierError = (error: any): boolean => {
  if (error?.response?.status === 409) {
    const errorMessage = extractErrorMessage(error).toLowerCase()
    return (
      errorMessage.includes("issn") ||
      errorMessage.includes("isbn") ||
      errorMessage.includes("doi") ||
      errorMessage.includes("duplicado") ||
      errorMessage.includes("ya existe") ||
      errorMessage.includes("already exists")
    )
  }
  return false
}

/**
 * Obtiene un mensaje amigable para errores de identificadores duplicados
 */
export const getDuplicateIdentifierMessage = (error: any): string => {
  const errorMessage = extractErrorMessage(error).toLowerCase()
  if (errorMessage.includes("issn")) {
    return "El ISSN ingresado ya está ocupado por otro registro. Por favor, verifique e ingrese un ISSN diferente."
  }
  if (errorMessage.includes("isbn")) {
    return "El ISBN ingresado ya está ocupado por otro registro. Por favor, verifique e ingrese un ISBN diferente."
  }
  if (errorMessage.includes("doi")) {
    return "El DOI ingresado ya está ocupado por otro registro. Por favor, verifique e ingrese un DOI diferente."
  }
  return "El identificador (ISSN, ISBN o DOI) ingresado ya está ocupado por otro registro. Por favor, verifique e ingrese un valor diferente."
}

