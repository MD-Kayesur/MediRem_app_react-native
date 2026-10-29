/**
 * Shared MediRem Monorepo Types
 */

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions?: string;
  frequency: string;
  selectedDays?: string[];
  startDate?: string;
  endDate?: string;
  time: string;
  timeSlot: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  pillsLeft: number;
  totalPills: number;
  imageUri?: string;
  status: 'active' | 'paused';
  alarmEnabled: boolean;
  notificationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMedicationInput {
  name: string;
  dosage: string;
  instructions?: string;
  frequency?: string;
  selectedDays?: string[];
  startDate?: string;
  endDate?: string;
  time?: string;
  timeSlot?: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  pillsLeft?: number;
  totalPills?: number;
  imageUri?: string;
  status?: 'active' | 'paused';
  alarmEnabled?: boolean;
  notificationId?: string;
}

export interface UpdateMedicationInput extends Partial<CreateMedicationInput> {}

export interface DoseLog {
  id: string;
  medicationId: string;
  scheduledTime: string;
  takenAt: string;
  status: 'taken' | 'skipped' | 'overdue';
  note?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
  uptime: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface SignInInput {
  email: string;
  password?: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password?: string;
  phone?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token?: string;
}


