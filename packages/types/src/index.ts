/**
 * Shared MediRem Monorepo Types
 */

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions?: string;
  frequency: string;
  selectedDays?: string[] | string;
  startDate?: string;
  endDate?: string;
  time: string;
  timeSlot: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | string;
  times?: string; // JSON array of dose times e.g. [{"slot":"Morning","time":"08:00 AM"},{"slot":"Afternoon","time":"01:00 PM"},{"slot":"Night","time":"08:00 PM"}]
  pillsLeft: number;
  totalPills: number;
  imageUri?: string;
  status: 'active' | 'paused' | string;
  alarmEnabled: boolean;
  notificationId?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMedicationInput {
  name: string;
  dosage: string;
  instructions?: string;
  frequency?: string;
  selectedDays?: string[] | string;
  startDate?: string;
  endDate?: string;
  time?: string;
  timeSlot?: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | string;
  times?: string;
  pillsLeft?: number;
  totalPills?: number;
  imageUri?: string;
  status?: 'active' | 'paused' | string;
  alarmEnabled?: boolean;
  notificationId?: string;
  userId?: string;
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

export interface VerifySignupInput {
  email: string;
  code: string;
}

export interface ResendVerifyCodeInput {
  email: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface VerifyResetCodeInput {
  email: string;
  code: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword?: string;
  password?: string;
}


