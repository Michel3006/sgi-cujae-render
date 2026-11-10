"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Modal } from "../common/Modal"
import { integrantService } from "../../services/integrantService"
import type { IntegrantWithRoles } from "../../types/api/integrant"
import "./IntegrantDetailsModal.css"

export type IntegrantDetailsFallback = {
  nombre?: string
  apellidos?: string
  correoElectronico?: string
  numeroIdentidad?: string
  entidad?: string
  esExterno?: boolean
}

interface IntegrantDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  integrantId: number | null
  fallback?: IntegrantDetailsFallback | null
  title?: string
}

const displayValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "—"
  return String(value)
}

const DetailItem = ({
  label,
  value,
  fullWidth = false,
}: {
  label: string
  value: string
  fullWidth?: boolean
}) => (
  <div className={`integrant-details-item${fullWidth ? " full-width" : ""}`}>
    <label>{label}</label>
    <span>{value}</span>
  </div>
)

export const IntegrantDetailsModal = ({
  isOpen,
  onClose,
  integrantId,
  fallback,
  title = "Detalles del integrante",
}: IntegrantDetailsModalProps) => {
  const [integrant, setIntegrant] = useState<IntegrantWithRoles | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setIntegrant(null)
      setError(null)
      return
    }

    if (!integrantId) {
      setIntegrant(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    const loadIntegrant = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await integrantService.getIntegrantById(integrantId)
        if (!cancelled) {
          setIntegrant(data)
        }
      } catch (err) {
        if (!cancelled) {
          setIntegrant(null)
          setError((err as Error).message || "No se pudieron cargar los datos del integrante")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadIntegrant()

    return () => {
      cancelled = true
    }
  }, [isOpen, integrantId])

  const renderFallbackContent = () => {
    const fullName = [fallback?.nombre, fallback?.apellidos].filter(Boolean).join(" ").trim()
    return (
      <div className="integrant-details-grid">
        <DetailItem label="Nombre completo" value={displayValue(fullName)} />
        <DetailItem
          label="Tipo"
          value={fallback?.esExterno ? "Externo" : "CUJAE"}
        />
        <DetailItem label="Correo electrónico" value={displayValue(fallback?.correoElectronico)} />
        <DetailItem label="Número de identidad" value={displayValue(fallback?.numeroIdentidad)} />
        <DetailItem label="Entidad / centro de trabajo" value={displayValue(fallback?.entidad)} fullWidth />
      </div>
    )
  }

  const renderIntegrantContent = () => {
    if (!integrant) return null

    const rolesLabel =
      integrant.roles && integrant.roles.length > 0
        ? integrant.roles.map((r) => r.role_name).join(", ")
        : "—"

    return (
      <div className="integrant-details-grid">
        <DetailItem label="Nombre completo" value={displayValue(integrant.name)} />
        <DetailItem label="Tipo" value={integrant.external ? "Externo" : "CUJAE"} />
        <DetailItem label="Número de identidad" value={displayValue(integrant.identity)} />
        <DetailItem label="Correo electrónico" value={displayValue(integrant.email)} />
        <DetailItem label="Teléfono" value={displayValue(integrant.phone)} />
        <DetailItem
          label="Tiempo disponible (horas)"
          value={displayValue(integrant.available_time)}
        />
        <DetailItem label="Centro de trabajo" value={displayValue(integrant.work_center)} />
        <DetailItem label="País" value={displayValue(integrant.country?.name)} />
        <DetailItem label="Facultad" value={displayValue(integrant.faculty?.name)} />
        <DetailItem label="Área de facultad" value={displayValue(integrant.faculty_area?.name)} />
        <DetailItem
          label="Grado docente"
          value={displayValue(integrant.docent_degree?.name)}
        />
        <DetailItem
          label="Grado científico"
          value={displayValue(integrant.cientific_degree?.name)}
        />
        <DetailItem
          label="Categoría general"
          value={displayValue(integrant.general_category?.name)}
        />
        <DetailItem label="Roles" value={rolesLabel} fullWidth />
        <DetailItem label="Currículum" value={displayValue(integrant.curriculum)} fullWidth />
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="integrant-details-modal">
        {isLoading && (
          <div className="integrant-details-loading" role="status" aria-live="polite">
            <Loader2 className="animate-spin" size={24} aria-hidden />
            <span>Cargando datos del integrante…</span>
          </div>
        )}

        {!isLoading && error && (
          <div className="integrant-details-error" role="alert">
            {error}
          </div>
        )}

        {!isLoading && !error && integrant && renderIntegrantContent()}

        {!isLoading && !error && !integrant && !integrantId && renderFallbackContent()}
      </div>
    </Modal>
  )
}
