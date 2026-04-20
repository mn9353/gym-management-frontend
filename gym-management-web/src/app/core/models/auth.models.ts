export type UserRole = 'ADMIN' | 'OWNER' | 'STAFF' | 'TRAINER' | 'MEMBER';

export interface UserProfile {
  id: string;
  gymId?: string | null;
  gymName?: string | null;
  gymSubscriptionPlan?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  profileImageUrl?: string | null;
  createdAt: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ResetPasswordRequest {
  identifier: string;
  code: string;
  newPassword: string;
}

export interface VerifyResetCodeRequest {
  identifier: string;
  code: string;
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

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}
