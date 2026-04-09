export interface GymDto {
  id: string;
  gymName: string;
  ownerName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  subscriptionPlan: string;
  isActive: boolean;
  usersCount: number;
  membersCount: number;
  createdAt: string;
}

export interface CreateGymDto {
  gymName: string;
  ownerName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  subscriptionPlan?: string;
}

export interface UpdateGymDto {
  gymName?: string;
  ownerName?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  subscriptionPlan?: string;
  isActive?: boolean;
}

export interface AppUserDto {
  id: string;
  gymId?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  role: 'ADMIN' | 'OWNER' | 'STAFF';
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserDto {
  gymId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  password: string;
  role: 'ADMIN' | 'OWNER' | 'STAFF';
}

export interface UpdateUserDto {
  fullName?: string;
  phone?: string | null;
  role?: 'ADMIN' | 'OWNER' | 'STAFF';
  isActive?: boolean;
}

export interface OwnerCreateUserDto {
  fullName: string;
  email: string;
  phone?: string | null;
  password: string;
  role: 'STAFF';
}
