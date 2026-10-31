import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import Constants from 'expo-constants';

export function getApiBaseUrl(): string {
  // 1. Explicit env override (e.g. EXPO_PUBLIC_API_URL in .env)
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

  // 3. Fallback: Host LAN IP reachable from physical Android / iOS devices over local Wi-Fi
  return 'http://10.10.23.22:3000/api';
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: getApiBaseUrl(),
    prepareHeaders: (headers, { getState }) => {
      headers.set('Content-Type', 'application/json');
      const state = getState() as any;
      const token = state?.auth?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const userId = state?.auth?.user?.id;
      if (userId) {
        headers.set('x-user-id', userId);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Medications', 'Doses'],
  endpoints: () => ({}),
});
