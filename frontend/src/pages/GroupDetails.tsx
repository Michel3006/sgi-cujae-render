"use client"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Card } from "../components/common/Card"
import { Button } from "../components/common/Button"
import { mockGroups } from "../services/mockData"
import { useAuthStore } from "../stores/authStore"
import type { IGroup } from "../types/index"
import "./GroupForm.css"

export const GroupDetails = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [group, setGroup] = useState<IGroup | null>(null)
  const [activeTab, setActiveTab] = useState<"datos" | "integrantes" | "registros" | "evaluaciones">("datos")
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.includes('admin') || false

  useEffect(() => {
    if (id) {
      const foundGroup = mockGroups.find((g) => g.id === id)
      if (foundGroup) {
        setGroup(foundGroup)
      } else {
        navigate("/groups")
      }
    }
  }, [id, navigate])

  if (!group) {
    return (
      <div className="form-page group-form">
        <Card>
          <p>Cargando detalles del grupo...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="form-page group-form">
      <div className="page-toolbar form-page__toolbar">
        <p className="page-toolbar__lead">Visualización de información del grupo de investigación</p>
      </div>

      <div className="form-tabs">
        <button className={`tab-button ${activeTab === "datos" ? "active" : ""}`} onClick={() => setActiveTab("datos")}>
          Datos Iniciales
        </button>
        <button
          className={`tab-button ${activeTab === "integrantes" ? "active" : ""}`}
          onClick={() => setActiveTab("integrantes")}
        >
          Integrantes
        </button>
        <button
          className={`tab-button ${activeTab === "registros" ? "active" : ""}`}
          onClick={() => setActiveTab("registros")}
        >
          Registros
        </button>
        <button
          className={`tab-button ${activeTab === "evaluaciones" ? "active" : ""}`}
          onClick={() => setActiveTab("evaluaciones")}
        >
          Evaluaciones
        </button>
      </div>

      {activeTab === "datos" && (
        <Card>
          <div className="tab-content">
            <div className="initial-data-section">
              <div className="data-header">
                <h2>Datos Iniciales del Grupo</h2>
                <p>Información básica del grupo de investigación</p>
              </div>

              <div className="data-display">
                <div className="data-item">
                  <label>Nombre del Grupo</label>
                  <p className="data-value">{group.nombre}</p>
                </div>
                <div className="data-item full-width">
                  <label>Descripción</label>
                  <p className="data-value">{group.descripcion || "No especificada"}</p>
                </div>
                <div className="data-item">
                  <label>Facultad</label>
                  <p className="data-value">{group.facultad || "No especificada"}</p>
                </div>
                <div className="data-item">
                  <label>Área</label>
                  <p className="data-value">{group.area || "No especificada"}</p>
                </div>
                <div className="data-item full-width">
                  <label>Temáticas</label>
                  <p className="data-value">{group.tematicas.join(", ") || "No especificadas"}</p>
                </div>
                <div className="data-item">
                  <label>Responsable</label>
                  <p className="data-value">
                    {group.responsable
                      ? `${group.responsable.nombre} ${group.responsable.apellidos}`
                      : "No asignado"}
                  </p>
                </div>
                <div className="data-item">
                  <label>Total de Integrantes</label>
                  <p className="data-value">{group.totalIntegrantes}</p>
                </div>
                <div className="data-item">
                  <label>Fecha de Creación</label>
                  <p className="data-value">{new Date(group.fechaCreacion).toLocaleDateString()}</p>
                </div>
                <div className="data-item">
                  <label>Última Actualización</label>
                  <p className="data-value">{new Date(group.fechaActualizacion).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="form-actions">
                <Button variant="secondary" onClick={() => navigate("/groups")}>
                  Volver a la Lista
                </Button>
                {isAdmin && (
                  <Button onClick={() => navigate(`/groups/${id}/edit`)}>Editar Grupo</Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "integrantes" && (
        <Card>
          <div className="tab-content">
            <div className="tab-header">
              <h2>Integrantes del Grupo</h2>
              <p>Lista de miembros que conforman el grupo de investigación</p>
            </div>

            <div className="members-table">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="empty-state">
                      No hay integrantes registrados en el sistema actualmente.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <Button onClick={() => navigate("/groups")}>Volver a la Lista</Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "registros" && (
        <Card>
          <div className="tab-content">
            <div className="tab-header">
              <h2>Registros Científicos</h2>
              <p>Publicaciones y trabajos asociados al grupo</p>
            </div>

            <div className="records-table">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Tipo</th>
                    <th>Año</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="empty-state">
                      No hay registros científicos asociados.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <Button onClick={() => navigate("/groups")}>Volver a la Lista</Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "evaluaciones" && (
        <Card>
          <div className="tab-content">
            <div className="tab-header">
              <h2>Evaluaciones de Integrantes</h2>
              <p>Desempeño de los miembros del grupo</p>
            </div>

            <div className="evaluations-table">
              <table>
                <thead>
                  <tr>
                    <th>Integrante</th>
                    <th>Evaluación</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="empty-state">
                      No hay evaluaciones registradas.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <Button onClick={() => navigate("/groups")}>Volver a la Lista</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
