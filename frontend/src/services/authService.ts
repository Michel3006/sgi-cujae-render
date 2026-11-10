import type {
  ICredentials,
  IAuthResponse,
  IUserRegistrationData,
  IPasswordChangeData,
  IPasswordRecoveryData,
} from "../types"
import { mockUsers } from "./mockData"

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const authService = {
  async login(credentials: ICredentials): Promise<IAuthResponse> {
    await delay(500)

    // Mock authentication
    const user = mockUsers.find((u) => u.nombreUsuario === credentials.username)

    if (!user || credentials.password !== "password123") {
      throw new Error("Credenciales inválidas")
    }

    return {
      token: "mock-jwt-token-" + Date.now(),
      user,
    }
  },

  async register(data: IUserRegistrationData): Promise<IAuthResponse> {
    await delay(800)

    // Mock registration
    if (data.contrasena !== data.confirmarContrasena) {
      throw new Error("Las contraseñas no coinciden")
    }

    const newUser = {
      id: String(Date.now()),
      nombre: data.nombre,
      apellidos: data.apellidos,
      numeroIdentidad: data.numeroIdentidad,
      correoElectronico: data.correoElectronico,
      nombreUsuario: data.nombreUsuario,
      roles: ["usuario" as const],
      esExterno: false,
      esAdministrador: false,
      pais: "Cuba",
    }

    return {
      token: "mock-jwt-token-" + Date.now(),
      user: newUser,
    }
  },

  async changePassword(data: IPasswordChangeData): Promise<void> {
    await delay(500)

    if (data.newPassword !== data.confirmNewPassword) {
      throw new Error("Las contraseñas no coinciden")
    }

    // Mock password change
    console.log("Password changed successfully")
  },

  async recoverPassword(data: IPasswordRecoveryData): Promise<void> {
    await delay(500)

    // Mock password recovery
    console.log("Recovery email sent to user:", data.nombreUsuario)
  },
}
