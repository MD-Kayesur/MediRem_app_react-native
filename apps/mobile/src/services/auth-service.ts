import { AuthUser } from '@medirem/types';
import { API_BASE_URL } from './api-service';

export const DEFAULT_USER: AuthUser = {
  id: 'usr_rahman_default',
  name: 'Rahman',
  email: 'rahman@medirem.app',
  phone: '+1 (555) 234-5678',
  createdAt: new Date().toISOString(),
};

let currentUser: AuthUser | null = { ...DEFAULT_USER };
const listeners = new Set<(user: AuthUser | null) => void>();

export function subscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  listeners.add(callback);
  callback(currentUser);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb(currentUser);
    } catch {
      // ignore
    }
  });
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

export function isAuthenticated(): boolean {
  return currentUser !== null;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password?: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (password !== undefined && password.length > 0 && password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  // Attempt backend sign-in if reachable
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.user) {
        currentUser = data.user;
        notifyListeners();
        return { success: true, user: currentUser ?? undefined };
      }
    }
  } catch {
    // Backend unreachable, proceed with local session
  }

  // Derive a friendly user name from email prefix or known demo
  let name = 'Rahman';
  if (cleanEmail.startsWith('rahman')) {
    name = 'Rahman';
  } else {
    const prefix = cleanEmail.split('@')[0];
    name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  currentUser = {
    id: `usr_${Date.now()}`,
    name,
    email: cleanEmail,
    phone: cleanEmail === DEFAULT_USER.email ? DEFAULT_USER.phone : undefined,
    createdAt: new Date().toISOString(),
  };

  notifyListeners();
  return { success: true, user: currentUser };
}

/**
 * Sign up a new user
 */
export async function signUp(
  name: string,
  email: string,
  password?: string,
  phone?: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone?.trim();

  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Please enter your full name (at least 2 characters).' };
  }

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (password && password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  // Attempt backend registration
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        email: cleanEmail,
        password,
        phone: cleanPhone,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.user) {
        currentUser = data.user;
        notifyListeners();
        return { success: true, user: currentUser ?? undefined };
      }
    }
  } catch {
    // Backend offline, fallback to local session
  }

  currentUser = {
    id: `usr_${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone || undefined,
    createdAt: new Date().toISOString(),
  };

  notifyListeners();
  return { success: true, user: currentUser };
}

/**
 * Continue as Guest without creating an account immediately
 */
export function continueAsGuest(): AuthUser {
  currentUser = {
    id: `guest_${Date.now()}`,
    name: 'Guest User',
    email: 'guest@medirem.local',
    createdAt: new Date().toISOString(),
  };
  notifyListeners();
  return currentUser;
}

/**
 * Sign out current user
 */
export function signOut(): void {
  currentUser = null;
  notifyListeners();
}
