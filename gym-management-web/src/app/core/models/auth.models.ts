export type UserRole = 'ADMIN' | 'OWNER' | 'STAFF';

export interface UserProfile {
  id: string;
  gymId?: string | null;
  gymName?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  profileImageUrl?: string | null;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
  accessToken?: string;
  refreshToken?: string;
  expiresIn: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn: string;
}
