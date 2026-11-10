"use client"

import { useState, useEffect } from "react"
import type { IUser, UserRole } from "../types"
import { userService } from "../services/userService"
import { usePermissions } from "../hooks/usePermissions"
import { Button } from "../components/common/Button"
import { Card } from "../components/common/Card"
import { OptionsMenu } from "../components/common/OptionsMenu"
import { Loader2, AlertCircle, Plus, Search } from "lucide-react"
import {
  ASSIGNABLE_USER_ROLES,
  getAddableRolesForDraft,
  isLockedUserRole,
  normalizeUserRolesForDisplay,
  ROLE_DISPLAY_LABELS,
} from "../utils/userRoleManagement"
import { useToast } from "../contexts/ToastContext"
import "./UserManagement.css"

export const UserManagement = () => {
  const { showToast } = useToast()
  const { isAdmin } = usePermissions()
  const [users, setUsers] = useState<IUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null)
  const [roleDraft, setRoleDraft] = useState<UserRole[]>([])
  const [roleToAdd, setRoleToAdd] = useState<UserRole>(ASSIGNABLE_USER_ROLES[0])
  const [showViewRolesModal, setShowViewRolesModal] = useState(false)
  const [showModifyRolesModal, setShowModifyRolesModal] = useState(false)
  const [isSavingRoles, setIsSavingRoles] = useState(false)
  useEffect(() => {
    void loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const usersData = await userService.getAllUsers()
      setUsers(usersData)
      if (selectedUser) {
        const updated = usersData.find((u) => u.id === selectedUser.id)
        if (updated) {
          setSelectedUser(updated)
        }
      }
    } catch (err) {
      console.error("Error loading users:", err)
      showToast(err instanceof Error ? err.message : "Error al cargar los usuarios", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenViewRoles = (user: IUser) => {
    setSelectedUser(user)
    setShowViewRolesModal(true)
  }

  const handleOpenModifyRoles = (user: IUser) => {
    const normalized = normalizeUserRolesForDisplay(user.roles)
    setSelectedUser(user)
    setRoleDraft(normalized)
    const addable = getAddableRolesForDraft(normalized)
    setRoleToAdd(addable[0] ?? ASSIGNABLE_USER_ROLES[0])
    setShowModifyRolesModal(true)
  }

  const handleCloseModifyRoles = () => {
    setShowModifyRolesModal(false)
    setSelectedUser(null)
    setRoleDraft([])
    setIsSavingRoles(false)
  }

  const handleAddRoleToDraft = () => {
    const addable = getAddableRolesForDraft(roleDraft)
    if (addable.length === 0) {
      showToast("No hay más roles disponibles para agregar", "error")
      return
    }

    const role = addable.includes(roleToAdd) ? roleToAdd : addable[0]
    if (roleDraft.includes(role)) {
      showToast("Ese rol ya está asignado", "error")
      return
    }

    const nextDraft = normalizeUserRolesForDisplay([...roleDraft, role])
    setRoleDraft(nextDraft)
    const nextAddable = getAddableRolesForDraft(nextDraft)
    setRoleToAdd(nextAddable[0] ?? ASSIGNABLE_USER_ROLES[0])
  }

  const handleRemoveRoleFromDraft = (role: UserRole) => {
    if (isLockedUserRole(role)) {
      showToast(`El rol "${ROLE_DISPLAY_LABELS[role]}" no puede eliminarse`, "error")
      return
    }

    const nextDraft = normalizeUserRolesForDisplay(roleDraft.filter((r) => r !== role))
    setRoleDraft(nextDraft)
    const nextAddable = getAddableRolesForDraft(nextDraft)
    setRoleToAdd(nextAddable[0] ?? ASSIGNABLE_USER_ROLES[0])
  }

  const handleSaveRoles = async () => {
    if (!selectedUser) {
      showToast("No hay usuario seleccionado", "error")
      return
    }

    setIsSavingRoles(true)
    try {
      const updatedUser = await userService.saveUserRoles(selectedUser.id, roleDraft)
      await loadUsers()
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
      showToast("Roles guardados correctamente", "success")
      handleCloseModifyRoles()
    } catch (err) {
      console.error("Error saving roles:", err)
      const message = err instanceof Error ? err.message : "Error al guardar los roles"
      showToast(message, "error")
    } finally {
      setIsSavingRoles(false)
    }
  }

  const getInitials = (nombre: string, apellidos: string) =>
    `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase()

  const filteredUsers = users.filter(
    (user) =>
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nombreUsuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.correoElectronico.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const addableRoles = getAddableRolesForDraft(roleDraft)

  if (loading) {
    return (
      <div className="list-page user-management">
        <div className="list-page__loading" role="status" aria-live="polite">
          <Loader2 className="animate-spin" size={32} aria-hidden="true" />
          <span>Cargando usuarios...</span>
        </div>
      </div>
    )
  }

  if (!isAdmin()) {
    return (
      <div className="list-page user-management">
        <div className="user-management-denied">
          <AlertCircle size={48} aria-hidden="true" />
          <h2>Acceso denegado</h2>
          <p>No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="list-page user-management">
      <div className="page-toolbar list-page__toolbar">
        <p className="page-toolbar__lead">
          Gestiona los usuarios y roles del sistema. Usuario y Administrador son fijos; Consejo, Autor y
          Publicador se gestionan desde aquí.
        </p>
      </div>

      <Card className="list-page__panel">
        <div className="list-page__filters">
          <div className="list-page__search">
            <Search size={20} aria-hidden />
            <input
              type="search"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="list-page__search-input"
              aria-label="Buscar usuarios"
            />
          </div>
        </div>

        <div className="list-page__body">
          <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Roles</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const displayRoles = normalizeUserRolesForDisplay(user.roles)
                return (
                  <tr key={user.id}>
                    <td className="user-info-cell">
                      <div className="user-info">
                        <div className="user-avatar" aria-hidden="true">
                          {getInitials(user.nombre, user.apellidos)}
                        </div>
                        <div className="user-details">
                          <div className="user-name">
                            {user.nombre} {user.apellidos}
                          </div>
                          <div className="user-email">{user.correoElectronico}</div>
                        </div>
                      </div>
                    </td>
                    <td className="role-cell">
                      <ul className="roles-tags-list" aria-label="Roles del usuario">
                        {displayRoles.map((role) => (
                          <li key={`${user.id}-${role}`}>
                            <span
                              className={`role-tag ${isLockedUserRole(role) ? "role-tag--locked" : ""}`}
                            >
                              {ROLE_DISPLAY_LABELS[role] || role}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="actions-cell">
                      <OptionsMenu
                        options={[
                          {
                            label: "Ver roles",
                            onClick: () => handleOpenViewRoles(user),
                          },
                          {
                            label: "Modificar roles",
                            onClick: () => handleOpenModifyRoles(user),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      </Card>

      {showViewRolesModal && selectedUser && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setShowViewRolesModal(false)}
        >
          <div
            className="modal-content-clean"
            role="dialog"
            aria-labelledby="view-roles-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="view-roles-title">Roles del usuario</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowViewRolesModal(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="user-info-text">
                <strong>
                  {selectedUser.nombre} {selectedUser.apellidos}
                </strong>
              </p>
              <p className="user-email-text">{selectedUser.correoElectronico}</p>
              <ul className="roles-display-list">
                {normalizeUserRolesForDisplay(selectedUser.roles).map((role) => (
                  <li key={role}>
                    <span
                      className={`role-badge ${isLockedUserRole(role) ? "role-badge--locked" : ""}`}
                    >
                      {ROLE_DISPLAY_LABELS[role] || role}
                      {isLockedUserRole(role) ? " (fijo)" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" type="button" onClick={() => setShowViewRolesModal(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModifyRolesModal && selectedUser && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={handleCloseModifyRoles}
        >
          <div
            className="modal-content-clean modal-content-clean--wide"
            role="dialog"
            aria-labelledby="modify-roles-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="modify-roles-title">Modificar roles</h2>
              <button
                type="button"
                className="modal-close"
                onClick={handleCloseModifyRoles}
                aria-label="Cerrar"
                disabled={isSavingRoles}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="user-info-text">
                <strong>
                  {selectedUser.nombre} {selectedUser.apellidos}
                </strong>
              </p>
              <p className="helper-text roles-helper">
                Agregue o quite roles y pulse <strong>Guardar cambios</strong>. Los roles Usuario y
                Administrador no se pueden modificar desde aquí.
              </p>

              <div className="current-roles">
                <label>Roles asignados</label>
                <ul className="roles-list">
                  {roleDraft.map((role) => (
                    <li key={role} className="role-item">
                      <span className="role-item__label">
                        {ROLE_DISPLAY_LABELS[role] || role}
                        {isLockedUserRole(role) && (
                          <span className="role-item__hint">No editable</span>
                        )}
                      </span>
                      {!isLockedUserRole(role) && (
                        <button
                          type="button"
                          className="remove-role-btn"
                          onClick={() => handleRemoveRoleFromDraft(role)}
                          aria-label={`Quitar ${ROLE_DISPLAY_LABELS[role]}`}
                          disabled={isSavingRoles}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="add-role-section">
                <label htmlFor="role-to-add">Agregar otro rol</label>
                <div className="add-role-row">
                  <select
                    id="role-to-add"
                    value={roleToAdd}
                    onChange={(e) => setRoleToAdd(e.target.value as UserRole)}
                    className="form-select"
                    disabled={addableRoles.length === 0 || isSavingRoles}
                  >
                    {addableRoles.length === 0 ? (
                      <option value="">Sin roles disponibles</option>
                    ) : (
                      addableRoles.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_DISPLAY_LABELS[role]}
                        </option>
                      ))
                    )}
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddRoleToDraft}
                    disabled={addableRoles.length === 0 || isSavingRoles}
                    aria-label="Agregar rol seleccionado"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <Button
                variant="secondary"
                type="button"
                onClick={handleCloseModifyRoles}
                disabled={isSavingRoles}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveRoles} disabled={isSavingRoles}>
                {isSavingRoles ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
