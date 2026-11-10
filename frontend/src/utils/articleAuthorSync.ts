import { integrantService } from "../services/integrantService"
import type { ExternalAuthor, AuthorId } from "../types/record/types"

export type RecordFormAuthor = {
  id: string
  integrantId?: number | null
  nombre?: string
  apellidos?: string
  esExterno?: boolean
  usuario?: {
    nombre?: string
    apellidos?: string
    correoElectronico?: string
    entidad?: string
    numeroIdentidad?: string
    id_country?: number | null
    esExterno?: boolean
  }
}

export const isExternalRecordAuthor = (author: RecordFormAuthor): boolean =>
  Boolean(author.esExterno || author.usuario?.esExterno)

const getAuthorFullName = (author: RecordFormAuthor): string => {
  const nombre = author.nombre ?? author.usuario?.nombre ?? ""
  const apellidos = author.apellidos ?? author.usuario?.apellidos ?? ""
  return `${nombre} ${apellidos}`.trim()
}

export const buildAuthorIdsFromAuthors = (
  authors: RecordFormAuthor[],
  fallbackCountryId: number | null,
): AuthorId[] => {
  const authorIds: AuthorId[] = []

  for (const author of authors) {
    if (author.integrantId != null) {
      authorIds.push(author.integrantId)
      continue
    }

    if (!isExternalRecordAuthor(author)) continue

    const idCountry = author.usuario?.id_country ?? fallbackCountryId
    if (idCountry == null) continue

    const externalAuthor: ExternalAuthor = {
      name: getAuthorFullName(author),
      work_center: author.usuario?.entidad?.trim() || "",
      email: author.usuario?.correoElectronico?.trim() || "",
      id_country: idCountry,
    }
    authorIds.push(externalAuthor)
  }

  return authorIds
}

export const resolveArticleAuthorIdsForUpdate = async (
  authors: RecordFormAuthor[],
): Promise<number[]> => {
  const authorIds: number[] = []

  for (const author of authors) {
    if (author.integrantId != null) {
      if (isExternalRecordAuthor(author)) {
        await integrantService.updateIntegrant(author.integrantId, {
          name: getAuthorFullName(author),
          work_center: author.usuario?.entidad?.trim() || "",
          email: author.usuario?.correoElectronico?.trim() || "",
          identity: author.usuario?.numeroIdentidad?.trim() || null,
          id_country: author.usuario?.id_country ?? undefined,
          external: true,
        })
      }
      authorIds.push(author.integrantId)
      continue
    }

    if (!isExternalRecordAuthor(author)) continue

    const idCountry = author.usuario?.id_country
    if (idCountry == null) {
      throw new Error("Cada autor externo debe tener un país asociado")
    }

    const created = await integrantService.createIntegrant({
      name: getAuthorFullName(author),
      work_center: author.usuario?.entidad?.trim() || "",
      email: author.usuario?.correoElectronico?.trim() || "",
      identity: author.usuario?.numeroIdentidad?.trim() || null,
      id_country: idCountry,
      external: true,
    })
    authorIds.push(created.id_integrant)
  }

  return authorIds
}
