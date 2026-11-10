"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Input } from "../common/Input"
import { Button } from "../common/Button"
import { useAuthStore } from "../../stores/authStore"
import { authService } from "../../services/auth/authService"
import { useToast } from "../../contexts/ToastContext"
import "./AuthForm.css"

const LOGIN_BACKGROUND_URL = "/images/login-cujae.png"
const CUJAE_LOGO_URL = "/images/logo-cujae.png"

export const AuthForm: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { login, updateUser } = useAuthStore()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await authService.login({  username: username.trim(), password })
      login(response.token)
      // Actualizar el usuario en el store (el authService ya lo guarda en localStorage)
      // Pero necesitamos actualizar el store también
      const userFromStorage = localStorage.getItem('user')
      if (userFromStorage) {
        try {
          const user = JSON.parse(userFromStorage)
          updateUser(user)
        } catch (parseError) {
          console.error('Error parsing user from storage:', parseError)
        }
      }
      navigate("/dashboard")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error al iniciar sesión", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div
        className="auth-page__background"
        style={{ backgroundImage: `url(${LOGIN_BACKGROUND_URL})` }}
        aria-hidden="true"
      />
      <div className="auth-page__overlay" aria-hidden="true" />

      <div className="auth-page__layout">
        <section className="auth-page__hero" aria-labelledby="auth-hero-title">
          <h1 id="auth-hero-title" className="auth-page__hero-title">
            Sistema de Gestión de Investigación
          </h1>
          <p className="auth-page__hero-text">
            Plataforma para investigadores, responsables de grupo/proyecto y administración de la gestión de investigación universitaria.
          </p>
        </section>

        <section className="auth-page__panel" aria-labelledby="auth-panel-title">
          <div className="auth-card">
            <header className="auth-card__header">
              <div className="auth-card__logo">
                <img
                  src={CUJAE_LOGO_URL}
                  alt="Logo CUJAE"
                  className="auth-card__logo-image"
                  width={56}
                  height={56}
                />
              </div>
              <div className="auth-card__titles">
                <h2 id="auth-panel-title" className="auth-card__title">
                  Sistema de Gestión de Investigación
                </h2>
                <p className="auth-card__subtitle">Iniciar sesión</p>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="auth-form">
              <Input
                label="Nombre de usuario"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su nombre de usuario"
                required
                autoComplete="username"
              />

              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
                autoComplete="current-password"
              />

              <Button type="submit" fullWidth disabled={loading} aria-busy={loading}>
                {loading ? "Iniciando sesión..." : "Entrar"}
              </Button>
            </form>

            <div className="auth-demo-info">
              <p>
                <strong>Demo:</strong> Correo: jperez@cujae.edu.cu | Contraseña: password123
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
