import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Medication } from '@medirem/types';

export function getApiBaseUrl(): string {
  // 1. Explicit env override
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 2. Check if running on a real device through Expo Go / Metro bundler
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000/api`;
    }
  }

  // 3. Android Emulator uses 10.0.2.2, iOS Simulator & Web use localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }
  if (Platform.OS === 'ios') {
    return 'http://10.10.23.22:3000/api';
  }
  return 'http://localhost:3000/api';
}

export const API_BASE_URL = getApiBaseUrl();

export type ServerMedication = Medication;

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

