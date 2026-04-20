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
  activeUsersCount: number;
  inactiveUsersCount: number;
  membersCount: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueTotal: number;
  notificationEmailSent?: boolean | null;
  notificationEmailMessage?: string | null;
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

export interface CreateGymOwnerDto {
  fullName: string;
  email: string;
  phone?: string | null;
}

export interface CreateGymWithOwnersDto {
  gym: CreateGymDto;
  owners: CreateGymOwnerDto[];
}

export interface GymWithOwnersDto {
  gym: GymDto;
  owners: AppUserDto[];
}

export interface AppUserDto {
  id: string;
  gymId?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  role: 'ADMIN' | 'OWNER' | 'STAFF' | 'TRAINER' | 'MEMBER';
  isActive: boolean;
  welcomeEmailSent?: boolean | null;
  welcomeEmailMessage?: string | null;
  createdAt: string;
}

export interface CreateUserDto {
  gymId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  role: 'ADMIN' | 'OWNER' | 'STAFF' | 'TRAINER' | 'MEMBER';
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  role?: 'ADMIN' | 'OWNER' | 'STAFF' | 'TRAINER' | 'MEMBER';
  isActive?: boolean;
}

export interface OwnerCreateUserDto {
  fullName: string;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  role: 'STAFF' | 'TRAINER';
}
