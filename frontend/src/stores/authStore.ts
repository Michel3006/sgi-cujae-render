import { create } from "zustand"
import type { IUser } from "../types"

interface AuthState {
  user: IUser | null
  token: string | null
  roles: String| null
  isAuthenticated: boolean
  login: ( token: string) => void
  logout: () => void
  updateUser: (user: IUser) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  roles: null,
  isAuthenticated: false,
  login: ( token) => {
    localStorage.setItem("token", token)
    set({  token, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    set({ user: null, token: null, isAuthenticated: false })
  },
  updateUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user))
    set({ user })
  },
}))

// Initialize auth state from localStorage (login guarda auth_token; compatibilidad con token)
const token = localStorage.getItem("token") || localStorage.getItem("auth_token")
const userStr = localStorage.getItem("user")
if (token && userStr) {
  try {
    const user = JSON.parse(userStr)
    useAuthStore.setState({ user, token, isAuthenticated: true })
  } catch (error) {
    console.error("Error parsing user from localStorage:", error)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  }
}
