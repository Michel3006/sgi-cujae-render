// Request Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  fullName?: string;
}

// Response Types
export interface AuthResponse {
  token: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role?: string;
  createdAt: string;
}

// Domain Models (transformados)
export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role?: string;
  createdAt: Date;
}

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
