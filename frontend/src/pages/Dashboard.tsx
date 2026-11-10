"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "../components/common/Card"
import {
  Users,
  FolderKanban,
  FileText,
  MessageCircle,
  PieChart,
  UserCog,
  ClipboardList,
  Plus,
  ArrowRight,
} from "lucide-react"
import { usePermissions } from "../hooks/usePermissions"
import "./Dashboard.css"

type PortalModule = {
  code: string
  title: string
  description: string
  listPath: string
  createPath?: string
  canCreate?: boolean
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>
}

type ManagementLink = {
  label: string
  path: string
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const {
    canCreateRecords,
    canCreateProjects,
    canCreateGroups,
    canViewStatistics,
    canManageUsers,
    canViewAuditLog,
    isIntegrant,
  } = usePermissions()

  const researchModules: PortalModule[] = [
    {
      code: "GRU",
      title: "Grupos de investigación",
      description: "Equipos, responsables, integrantes y evaluaciones del grupo.",
      listPath: "/groups",
      createPath: "/groups/new",
      canCreate: canCreateGroups(),
      icon: Users,
    },
    {
      code: "PRO",
      title: "Proyectos de investigación",
      description: "Seguimiento de proyectos, estados, integrantes y registros asociados.",
      listPath: "/projects",
      createPath: "/projects/new",
      canCreate: canCreateProjects(),
      icon: FolderKanban,
    },
    {
      code: "REG",
      title: "Registros científicos",
      description: "Artículos, libros, tesis, premios, normas, patentes y demás producción científica.",
      listPath: "/records",
      createPath: "/records/new",
      canCreate: canCreateRecords(),
      icon: FileText,
    },
  ]

  const managementLinks: ManagementLink[] = [
    ...(canViewStatistics()
      ? [{ label: "Estadísticas y reportes", path: "/statistics", icon: PieChart }]
      : []),
    ...(canManageUsers() ? [{ label: "Gestión de usuarios", path: "/users", icon: UserCog }] : []),
    ...(canViewAuditLog() ? [{ label: "Bitácora del sistema", path: "/audit", icon: ClipboardList }] : []),
  ]

  const hasManagementSection = managementLinks.length > 0
  const hasCreateQuickActions =
    canCreateRecords() || canCreateProjects() || canCreateGroups()

  const welcomeText = isIntegrant()
    ? "Consulte la información de investigación de la institución y acceda a cada módulo desde los bloques siguientes."
    : "Centralice la gestión de grupos, proyectos y registros científicos desde un solo punto de acceso."

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  const handleModuleKeyDown = (event: React.KeyboardEvent, path: string) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    handleNavigate(path)
  }

  return (
    <div className="dashboard">
      <p className="dashboard-intro">{welcomeText}</p>

      <section className="dashboard-section" aria-labelledby="dashboard-research-heading">
        <h2 id="dashboard-research-heading" className="dashboard-section__title">
          Investigación en la institución
        </h2>
        <div className="dashboard-portal-grid">
          {researchModules.map((module) => (
            <article key={module.code} className="dashboard-module">
              <button
                type="button"
                className="dashboard-module__main"
                onClick={() => handleNavigate(module.listPath)}
                onKeyDown={(event) => handleModuleKeyDown(event, module.listPath)}
                aria-label={`Ir a ${module.title}`}
              >
                <span className="dashboard-module__code" aria-hidden>
                  {module.code}
                </span>
                <span className="dashboard-module__icon" aria-hidden>
                  <module.icon size={22} />
                </span>
                <span className="dashboard-module__title">{module.title}</span>
                <span className="dashboard-module__description">{module.description}</span>
                <span className="dashboard-module__cta">
                  Ver módulo
                  <ArrowRight size={16} aria-hidden />
                </span>
              </button>
              {module.canCreate && module.createPath ? (
                <button
                  type="button"
                  className="dashboard-module__create"
                  onClick={() => handleNavigate(module.createPath!)}
                  aria-label={`Crear en ${module.title}`}
                >
                  <Plus size={16} aria-hidden />
                  Crear nuevo
                </button>
              ) : null}
            </article>
          ))}

          <article className="dashboard-module dashboard-module--assistant">
            <button
              type="button"
              className="dashboard-module__main"
              onClick={() => handleNavigate("/assistant")}
              onKeyDown={(event) => handleModuleKeyDown(event, "/assistant")}
              aria-label="Abrir asistente virtual"
            >
              <span className="dashboard-module__code" aria-hidden>
                ASI
              </span>
              <span className="dashboard-module__icon" aria-hidden>
                <MessageCircle size={22} />
              </span>
              <span className="dashboard-module__title">Asistente virtual</span>
              <span className="dashboard-module__description">
                Orientación sobre el sistema y consultas en lenguaje natural.
              </span>
              <span className="dashboard-module__cta">
                Abrir chat
                <ArrowRight size={16} aria-hidden />
              </span>
            </button>
          </article>
        </div>
      </section>

      {hasManagementSection ? (
        <section className="dashboard-section" aria-labelledby="dashboard-management-heading">
          <h2 id="dashboard-management-heading" className="dashboard-section__title">
            Gestión del sistema
          </h2>
          <Card className="dashboard-management-card" padding="lg">
            <div className="dashboard-management-card__header">
              <span className="dashboard-management-card__code" aria-hidden>
                GES
              </span>
              <div>
                <h3 className="dashboard-management-card__title">Administración y seguimiento</h3>
                <p className="dashboard-management-card__description">
                  Usuarios, estadísticas institucionales y trazabilidad de acciones.
                </p>
              </div>
            </div>
            <ul className="dashboard-management-links">
              {managementLinks.map((link) => (
                <li key={link.path}>
                  <button
                    type="button"
                    className="dashboard-management-link"
                    onClick={() => handleNavigate(link.path)}
                  >
                    <link.icon size={20} aria-hidden />
                    <span>{link.label}</span>
                    <ArrowRight size={16} className="dashboard-management-link__arrow" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {hasCreateQuickActions ? (
        <section className="dashboard-section" aria-labelledby="dashboard-quick-heading">
          <h2 id="dashboard-quick-heading" className="dashboard-section__title">
            Accesos directos de creación
          </h2>
          <div className="dashboard-quick-grid">
            {canCreateRecords() ? (
              <button
                type="button"
                className="dashboard-quick-chip"
                onClick={() => handleNavigate("/records/new")}
              >
                <FileText size={18} aria-hidden />
                Nuevo registro
              </button>
            ) : null}
            {canCreateProjects() ? (
              <button
                type="button"
                className="dashboard-quick-chip"
                onClick={() => handleNavigate("/projects/new")}
              >
                <FolderKanban size={18} aria-hidden />
                Nuevo proyecto
              </button>
            ) : null}
            {canCreateGroups() ? (
              <button
                type="button"
                className="dashboard-quick-chip"
                onClick={() => handleNavigate("/groups/new")}
              >
                <Users size={18} aria-hidden />
                Nuevo grupo
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
