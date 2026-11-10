import type { IAuditLog } from "../types"

// Mock audit log service
class AuditService {
  private logs: IAuditLog[] = []

  async logAction(
    usuario: any,
    tipoAccion: IAuditLog["tipoAccion"],
    origen: string,
    metodo: IAuditLog["metodo"],
    ruta: string,
    codigo: number,
    mensaje: string,
    detalles?: Record<string, any>,
  ): Promise<void> {
    const now = new Date()
    const log: IAuditLog = {
      id: `log-${Date.now()}`,
      usuario,
      fecha: now.toISOString().split("T")[0],
      hora: now.toTimeString().split(" ")[0],
      tipoAccion,
      origen,
      metodo,
      ruta,
      codigo,
      mensaje,
      detalles,
    }
    this.logs.push(log)
    console.log("[v0] Audit log created:", log)
  }

  async getLogs(filters?: {
    usuario?: string
    tipoAccion?: string
    fechaInicio?: string
    fechaFin?: string
  }): Promise<IAuditLog[]> {
    let filtered = [...this.logs]

    if (filters?.usuario) {
      filtered = filtered.filter((log) => log.usuario.id === filters.usuario)
    }
    if (filters?.tipoAccion) {
      filtered = filtered.filter((log) => log.tipoAccion === filters.tipoAccion)
    }
    if (filters?.fechaInicio) {
      filtered = filtered.filter((log) => log.fecha >= filters.fechaInicio!)
    }
    if (filters?.fechaFin) {
      filtered = filtered.filter((log) => log.fecha <= filters.fechaFin!)
    }

    return filtered
  }
}

export const auditService = new AuditService()
