/** Integrante elegido como responsable (`id_admin`) del grupo. */
export const getGroupResponsableIntegrantId = (
  responsableId: number | null | undefined,
): number | null => {
  if (responsableId == null || responsableId <= 0) return null
  return responsableId
}

export const isGroupResponsableIntegrant = (
  integrantId: number,
  responsableId: number | null | undefined,
): boolean => {
  const responsableIntegrantId = getGroupResponsableIntegrantId(responsableId)
  return responsableIntegrantId !== null && integrantId === responsableIntegrantId
}

export const filterMemberIdsExcludingResponsable = (
  memberIds: number[],
  responsableId: number | null | undefined,
): number[] => {
  const responsableIntegrantId = getGroupResponsableIntegrantId(responsableId)
  if (responsableIntegrantId === null) return memberIds
  return memberIds.filter((id) => id !== responsableIntegrantId)
}
