"use client"

import React from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../stores/authStore"
import { usePermissions } from "../../hooks/usePermissions"
import {
  LogOut,
  Users,
  FolderKanban,
  FileText,
  BarChart3,
  UserCog,
  ClipboardList,
  PieChart,
  MessageCircle,
  Menu,
  X,
} from "lucide-react"
import { Breadcrumbs } from "./Breadcrumbs"
import { buildBreadcrumbs, getActiveNavPath, getSectionTitle } from "./navigationConfig"
import "./Layout.css"

const CUJAE_LOGO_URL = "/images/logo-cujae.png"

export const Layout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { canViewStatistics, canManageUsers, canViewAuditLog } = usePermissions()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const menuItems = [
    { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Grupos", path: "/groups" },
    { icon: FolderKanban, label: "Proyectos", path: "/projects" },
    { icon: FileText, label: "Registros", path: "/records" },
    { icon: MessageCircle, label: "Asistente", path: "/assistant" },
    ...(canViewStatistics()
      ? [{ icon: PieChart, label: "Estadísticas", path: "/statistics" }]
      : []),
    ...(canManageUsers() ? [{ icon: UserCog, label: "Usuarios", path: "/users" }] : []),
    ...(canViewAuditLog() ? [{ icon: ClipboardList, label: "Bitácora", path: "/audit" }] : []),
  ]

  const activeNavPath = getActiveNavPath(location.pathname)
  const breadcrumbs = buildBreadcrumbs(location.pathname)
  const sectionTitle = getSectionTitle(location.pathname)
  const isDashboard =
    location.pathname === "/dashboard" || location.pathname === "/"

  const handleNavigate = (path: string) => {
    navigate(path)
    setMobileNavOpen(false)
  }

  const handleToggleMobileNav = () => {
    setMobileNavOpen((prev) => !prev)
  }

  const userRoleLabel = user?.roles?.[0]?.replace(/_/g, " ") ?? "usuario"

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <img src={CUJAE_LOGO_URL} alt="Logo CUJAE" className="app-header__logo" width={40} height={40} />
          <div className="app-header__brand-text">
            <span className="app-header__brand-title">Sistema de Gestión de Investigación</span>
            <span className="app-header__brand-subtitle">CUJAE</span>
          </div>
        </div>

        <div className="app-header__actions">
          <div className="app-header__user">
            <p className="app-header__user-name">
              {user?.nombre} {user?.apellidos}
            </p>
            <p className="app-header__user-role">{userRoleLabel}</p>
          </div>
          <button
            type="button"
            className="app-header__logout"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} aria-hidden />
            <span className="app-header__logout-label">Salir</span>
          </button>
          <button
            type="button"
            className="app-header__menu-toggle"
            onClick={handleToggleMobileNav}
            aria-label={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <nav
        className={`app-nav ${mobileNavOpen ? "app-nav--open" : ""}`}
        aria-label="Navegación principal"
      >
        <ul className="app-nav__list">
          {menuItems.map((item) => {
            const isActive =
              activeNavPath === item.path ||
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path))

            return (
              <li key={item.path} className="app-nav__item">
                <button
                  type="button"
                  className={`app-nav__link ${isActive ? "app-nav__link--active" : ""}`}
                  onClick={() => handleNavigate(item.path)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon size={18} aria-hidden />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <Breadcrumbs items={breadcrumbs} />

      {!isDashboard ? (
        <div className="app-section-banner" role="region" aria-label="Sección actual">
          <h1 className="app-section-banner__title">{sectionTitle}</h1>
        </div>
      ) : null}

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
