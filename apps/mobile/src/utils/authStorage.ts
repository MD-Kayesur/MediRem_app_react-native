import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AuthUser } from '@medirem/types';

const SESSION_STORAGE_KEY = '@medirem_session';

export interface StoredSession {
  user: AuthUser;
  token?: string | null;
  savedAt: string;
}

// In-memory fast cache to survive component unmounts and hot-reloads
let memoryCacheSession: StoredSession | null = null;

/**
 * Save logged-in user credentials to persistent local storage and in-memory cache
 */
export async function saveUserSession(user: AuthUser, token?: string | null): Promise<void> {
  const payload: StoredSession = {
    user,
    token: token || null,
    savedAt: new Date().toISOString(),
  };

  memoryCacheSession = payload;

  try {
    const raw = JSON.stringify(payload);
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, raw);

    // If running on web, also save synchronously to window.localStorage
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SESSION_STORAGE_KEY, raw);
      } catch {
        // safe fallback
      }
    }
  } catch (err) {
    console.warn('[authStorage] Failed to save session:', err);
  }
}

/**
 * Retrieve persisted user credentials from memory, AsyncStorage, or Web localStorage
 */
export async function getUserSession(): Promise<StoredSession | null> {
  if (memoryCacheSession?.user?.id) {
    return memoryCacheSession;
  }

  try {
    let raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

    // Fallback for Web if AsyncStorage has not populated yet
    if (!raw && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      } catch {
        // safe fallback
      }
    }

    if (!raw) return null;

    const session: StoredSession = JSON.parse(raw);
    if (session?.user && session.user.id) {
      memoryCacheSession = session;
      return session;
    }
    return null;
  } catch (err) {
    console.warn('[authStorage] Failed to read session:', err);
    return null;
  }
}

/**
 * Clear persisted user session on manual Log Out
 */
export async function clearUserSession(): Promise<void> {
  memoryCacheSession = null;
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // safe fallback
      }
    }
  } catch (err) {
    console.warn('[authStorage] Failed to clear session:', err);
  }
}
