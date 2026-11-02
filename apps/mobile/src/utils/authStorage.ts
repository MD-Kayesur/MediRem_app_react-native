import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '@medirem/types';

const SESSION_STORAGE_KEY = '@medirem_session';

export interface StoredSession {
  user: AuthUser;
  token?: string | null;
  savedAt: string;
}

/**
 * Save logged-in user credentials to persistent local storage
 */
export async function saveUserSession(user: AuthUser, token?: string | null): Promise<void> {
  try {
    const payload: StoredSession = {
      user,
      token: token || null,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[authStorage] Failed to save session:', err);
  }
}

/**
 * Retrieve persisted user credentials from local storage
 */
export async function getUserSession(): Promise<StoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: StoredSession = JSON.parse(raw);
    if (session?.user && session.user.id) {
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
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn('[authStorage] Failed to clear session:', err);
  }
}
