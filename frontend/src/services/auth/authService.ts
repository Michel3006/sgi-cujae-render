import { apiClient } from '../api/client';
import type { 
  LoginRequest, 
  RegisterRequest, 
  User 
} from '../../types/api/auth';
import type { AxiosResponse } from 'axios';
import { integrantService } from '../integrantService';
import type { IntegrantWithRoles } from '../../types/api/integrant';
import type { IUser, UserRole } from '../../types';
import {
  mapBackendRoleToUserRole,
  normalizeUserRolesForDisplay,
} from '../../utils/userRoleManagement';

/**
 * Transforma la respuesta del servidor al modelo de dominio
 */
const transformAuthResponse = (response: AxiosResponse): { token: string, user_id: string } => {
  return {
    token: response.data.access_token,
    user_id: response.data.user_id
  };
};

/**
 * Mapea IntegrantWithRoles a IUser
 */
const mapIntegrantToIUser = (integrant: IntegrantWithRoles): IUser => {
  const nameParts = integrant.name.split(' ');
  const nombre = nameParts[0] || '';
  const apellidos = nameParts.slice(1).join(' ') || '';

  const roles: UserRole[] = integrant.roles?.length
    ? normalizeUserRolesForDisplay(
        integrant.roles.map((r) => mapBackendRoleToUserRole(r)),
      )
    : (['usuario'] as UserRole[]);

  return {
    id: integrant.id_integrant.toString(),
    nombre,
    apellidos,
    numeroIdentidad: integrant.identity || '',
    correoElectronico: integrant.email || '',
    nombreUsuario: integrant.email?.split('@')[0] || '',
    roles,
    esExterno: integrant.external,
    esAdministrador: roles.includes('admin'),
    telefono: integrant.phone || undefined,
    lugarTrabajo: integrant.work_center || undefined,
    fondoTiempo: integrant.available_time?.toString() || undefined,
    curriculum: integrant.curriculum || undefined,
  };
};

/**
 * Servicio de autenticación
 * Maneja todas las peticiones relacionadas con auth
 */
export const authService = {
  /**
   * Inicia sesión con credenciales
   */
  async login(credentials: LoginRequest): Promise<{ token: string, user: IUser }> {
    console.log(credentials);
    const response = await apiClient.post('/auth/login', {
      'user_name': credentials.username,
      'password': credentials.password
    });
    console.log(response.data);
    const transformed = transformAuthResponse(response);
    
    // Guardar token en localStorage
    localStorage.setItem('auth_token', transformed.token);
    localStorage.setItem('user_id', transformed.user_id);
    
    // Obtener el usuario completo con sus roles
    try {
      const integrant = await integrantService.getIntegrantById(parseInt(transformed.user_id));
      const user = mapIntegrantToIUser(integrant);
      
      // Guardar usuario en localStorage
      localStorage.setItem('user', JSON.stringify(user));
      
      return { token: transformed.token, user };
    } catch (error) {
      console.error('Error obteniendo usuario completo:', error);
      // Si falla, crear un usuario básico con los roles del token
      // (Los roles vienen en el token JWT, pero por ahora usamos el endpoint)
      throw error;
    }
  },

  /**
   * Registra un nuevo usuario
   */
  async register(data: RegisterRequest): Promise<{  token: string }> {
    const response = await apiClient.post('/auth/register', data);
    const transformed = transformAuthResponse(response.data);
    
    // Guardar token en localStorage
    localStorage.setItem('auth_token', transformed.token);
   
    
    return transformed;
  },

  /**
   * Cierra la sesión actual
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Limpiar datos locales siempre
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },

  /**
   * Verifica si el token actual es válido
   */
  async verifyToken(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/auth/verify');
    return {
      ...response.data.user,
      createdAt: new Date(response.data.user.createdAt),
    };
  },

  /**
   * Obtiene el usuario actual desde localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      const user = JSON.parse(userStr);
      return {
        ...user,
        createdAt: new Date(user.createdAt),
      };
    } catch {
      return null;
    }
  },

  /**
   * Obtiene el token actual desde localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },
};
