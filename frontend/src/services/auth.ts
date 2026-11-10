import type { IUser } from "../types"
import { mockUsers } from "./mockData"

export const getCurrentUser = (): IUser | null => {
  // In a real app, this would get the authenticated user from a session/token
  // For mock data, return the first user as the current logged-in user
  return mockUsers[0] || null
}

export const login = (email: string): IUser | null => {
  // Mock login - in real app would validate credentials
  const user = mockUsers.find((u) => u.correoElectronico === email)
  return user || null
}

export const logout = (): void => {
  // Mock logout
  console.log("User logged out")
}
