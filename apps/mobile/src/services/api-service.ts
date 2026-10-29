import { Platform } from 'react-native';

/**
 * Default backend API base URL
 * Android Emulator uses 10.0.2.2, iOS Simulator uses localhost, physical devices use machine IP
 */
export const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';

export interface ServerMedication {
  id: string;
  name: string;
  dosage: string;
  instructions?: string;
  frequency?: string;
  selectedDays?: string;
  startDate?: string;
  endDate?: string;
  time: string;
  timeSlot: string;
  pillsLeft: number;
  totalPills: number;
  imageUri?: string;
  status: string;
  alarmEnabled: boolean;
  notificationId?: string;
}

export async function checkBackendHealth(): Promise<{ status: string; uptime?: number } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchServerMedications(): Promise<ServerMedication[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/medications`, { method: 'GET' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createServerMedication(med: Partial<ServerMedication>): Promise<ServerMedication | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(med),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteServerMedication(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/medications/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function takeDoseOnServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/medications/${id}/take-dose`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

