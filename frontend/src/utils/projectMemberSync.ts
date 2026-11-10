import { integrantService } from "../services/integrantService"

export type ProjectFormMemberUser = {
  id: string
  nombre: string
  apellidos: string
  correoElectronico: string
  nombreUsuario?: string
  numeroIdentidad?: string
  entidad?: string
  roles?: unknown[]
  esExterno: boolean
  esAdministrador?: boolean
}

export type ProjectFormMember = {
  id: string
  integrantId: number | null
  usuario: ProjectFormMemberUser
  rol: string
}

const buildIntegrantName = (usuario: ProjectFormMemberUser): string =>
  `${usuario.nombre} ${usuario.apellidos}`.trim()

export const syncProjectMembersToIntegrants = async (
  members: ProjectFormMember[],
): Promise<{ memberIds: number[]; updatedMembers: ProjectFormMember[] }> => {
  const memberIds: number[] = []
  const updatedMembers: ProjectFormMember[] = []

  for (const member of members) {
    const fullName = buildIntegrantName(member.usuario)

    if (member.integrantId) {
      if (member.usuario.esExterno) {
        await integrantService.updateIntegrant(member.integrantId, {
          name: fullName,
          identity: member.usuario.numeroIdentidad || undefined,
          email: member.usuario.correoElectronico || undefined,
          work_center: member.usuario.entidad || undefined,
          external: true,
        })
      }
      memberIds.push(member.integrantId)
      updatedMembers.push(member)
      continue
    }

    if (!member.usuario.esExterno) {
      continue
    }

    const created = await integrantService.createIntegrant({
      name: fullName,
      identity: member.usuario.numeroIdentidad || "",
      external: true,
      email: member.usuario.correoElectronico || "",
      work_center: member.usuario.entidad || "",
      phone: "",
      id_country: null,
      id_faculty: null,
      id_faculty_area: null,
      id_cientific_degree: null,
      id_docent_degree: null,
      id_general_category: null,
      available_time: null,
      curriculum: null,
    })

    memberIds.push(created.id_integrant)
    updatedMembers.push({
      ...member,
      integrantId: created.id_integrant,
      usuario: { ...member.usuario, id: String(created.id_integrant) },
    })
  }

  return { memberIds, updatedMembers }
}
