/**
 * Validación de documentos de identidad según nacionalidad (código ISO o nombre).
 */

export type IdentityCountryContext = {
  code?: string | null
  name?: string | null
}

const normalizeCountryKey = (ctx: IdentityCountryContext): string => {
  const code = ctx.code?.trim().toUpperCase() ?? ''
  if (code) return code
  const name = ctx.name?.trim().toLowerCase() ?? ''
  if (name.includes('cuba')) return 'CU'
  if (name.includes('españa') || name.includes('espana')) return 'ES'
  if (name.includes('méxico') || name.includes('mexico')) return 'MX'
  if (name.includes('argentina')) return 'AR'
  if (name.includes('venezuela')) return 'VE'
  if (name.includes('colombia')) return 'CO'
  if (name.includes('estados unidos') || name === 'usa') return 'US'
  return 'GENERIC'
}

const isValidCalendarDate = (year: number, month: number, day: number): boolean => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/** Carné de identidad cubano: 11 dígitos; los 6 primeros forman YYMMDD válido. */
const validateCubanIdentity = (value: string): boolean => {
  const clean = value.replace(/[\s-]/g, '')
  if (!/^\d{11}$/.test(clean)) return false
  const yy = parseInt(clean.slice(0, 2), 10)
  const mm = parseInt(clean.slice(2, 4), 10)
  const dd = parseInt(clean.slice(4, 6), 10)
  const fullYear = yy <= 30 ? 2000 + yy : 1900 + yy
  return isValidCalendarDate(fullYear, mm, dd)
}

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

const validateSpanishDni = (value: string): boolean => {
  const clean = value.replace(/[\s-]/g, '').toUpperCase()
  const dniMatch = /^(\d{8})([A-Z])$/.exec(clean)
  if (dniMatch) {
    const number = parseInt(dniMatch[1], 10)
    const expected = DNI_LETTERS[number % 23]
    return dniMatch[2] === expected
  }
  const nieMatch = /^([XYZ])(\d{7})([A-Z])$/.exec(clean)
  if (nieMatch) {
    const prefixMap: Record<string, string> = { X: '0', Y: '1', Z: '2' }
    const number = parseInt(`${prefixMap[nieMatch[1]]}${nieMatch[2]}`, 10)
    const expected = DNI_LETTERS[number % 23]
    return nieMatch[3] === expected
  }
  return false
}

/** CURP mexicano: 18 caracteres alfanuméricos. */
const validateMexicanCurp = (value: string): boolean => {
  const clean = value.replace(/[\s-]/g, '').toUpperCase()
  return /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(clean)
}

const validateGenericIdentity = (value: string): boolean => {
  const clean = value.replace(/[\s-]/g, '')
  return clean.length >= 4 && clean.length <= 25 && /^[A-Za-z0-9]+$/.test(clean)
}

export const getIdentityFormatHint = (ctx: IdentityCountryContext): string => {
  switch (normalizeCountryKey(ctx)) {
    case 'CU':
      return '11 dígitos (carné de identidad cubano, ej: 99010112345)'
    case 'ES':
      return 'DNI: 8 dígitos + letra, o NIE: X/Y/Z + 7 dígitos + letra'
    case 'MX':
      return 'CURP de 18 caracteres alfanuméricos'
    case 'AR':
      return '7 u 8 dígitos (DNI argentino)'
    case 'VE':
      return 'Formato V-12345678 o E-12345678'
    case 'CO':
      return '6 a 10 dígitos (cédula de ciudadanía)'
    case 'US':
      return '4 a 20 caracteres alfanuméricos (pasaporte o ID)'
    default:
      return '4 a 25 caracteres alfanuméricos'
  }
}

export const validateIdentityByCountry = (
  identity: string | null | undefined,
  ctx: IdentityCountryContext,
): string | null => {
  if (!identity || identity.trim() === '') {
    return 'El documento de identidad es requerido'
  }

  const clean = identity.trim()
  const key = normalizeCountryKey(ctx)

  switch (key) {
    case 'CU':
      if (!validateCubanIdentity(clean)) {
        return 'Carné cubano inválido: debe tener 11 dígitos y una fecha de nacimiento válida (YYMMDD)'
      }
      return null
    case 'ES':
      if (!validateSpanishDni(clean)) {
        return 'DNI/NIE español inválido'
      }
      return null
    case 'MX':
      if (!validateMexicanCurp(clean)) {
        return 'CURP mexicano inválido (18 caracteres alfanuméricos)'
      }
      return null
    case 'AR': {
      const digits = clean.replace(/[\s.-]/g, '')
      if (!/^\d{7,8}$/.test(digits)) {
        return 'DNI argentino inválido (7 u 8 dígitos)'
      }
      return null
    }
    case 'VE': {
      const normalized = clean.toUpperCase().replace(/\s/g, '')
      if (!/^[VE]-?\d{6,9}$/.test(normalized)) {
        return 'Cédula venezolana inválida (V- o E- seguido de 6 a 9 dígitos)'
      }
      return null
    }
    case 'CO': {
      const digits = clean.replace(/[\s.-]/g, '')
      if (!/^\d{6,10}$/.test(digits)) {
        return 'Cédula colombiana inválida (6 a 10 dígitos)'
      }
      return null
    }
    default:
      if (!validateGenericIdentity(clean)) {
        return 'Documento de identidad inválido (4-25 caracteres alfanuméricos)'
      }
      return null
  }
}

export const findCountryContext = (
  countryId: number | null | undefined,
  countries: Array<{ id_country?: number; id?: number; name: string; code?: string | null }>,
): IdentityCountryContext => {
  if (countryId == null) return { code: null, name: null }
  const match = countries.find((c) => (c.id_country ?? c.id) === countryId)
  return { code: match?.code ?? null, name: match?.name ?? null }
}
