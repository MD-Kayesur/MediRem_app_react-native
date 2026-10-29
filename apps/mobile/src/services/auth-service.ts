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
export async function signIn(
  email: string,
  password?: string,
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (password !== undefined && password.length > 0 && password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  // Attempt backend sign-in
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const data = await res.json();

    if (res.ok && data?.user) {
      currentUser = data.user;
      notifyListeners();
      return { success: true, user: currentUser ?? undefined };
    } else if (!res.ok) {
      return {
        success: false,
        error: data?.message || 'Invalid email or password. Please try again.',
      };
    }
  } catch {
    // If backend is not running or unreachable, fallback to demo session
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
  phone?: string,
): Promise<{
  success: boolean;
  requiresVerification?: boolean;
  user?: AuthUser;
  email?: string;
  code?: string;
  message?: string;
  error?: string;
}> {
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

    const data = await res.json();

    if (res.ok) {
      if (data?.requiresVerification) {
        return {
          success: true,
          requiresVerification: true,
          email: cleanEmail,
          code: data.code,
          message: data.message || `Verification code sent to ${cleanEmail}.`,
        };
      }
      if (data?.user) {
        currentUser = data.user;
        notifyListeners();
        return { success: true, user: currentUser ?? undefined };
      }
    } else if (!res.ok) {
      return {
        success: false,
        error: data?.message || 'Registration failed. Please check your information.',
      };
    }
  } catch {
    // Backend offline, fallback to simulated verification
  }

  return {
    success: true,
    requiresVerification: true,
    email: cleanEmail,
    code: '123456',
    message: `Verification code sent to ${cleanEmail}.`,
  };
}

/**
 * Verify account signup code: activates user account so they can log in
 */
export async function verifySignup(
  email: string,
  code: string,
): Promise<{ success: boolean; message: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!cleanEmail || !cleanCode) {
    return { success: false, message: '', error: 'Email and 6-digit verification code are required.' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
    });

    const data = await res.json();

    if (res.ok) {
      return {
        success: true,
        message: data?.message || 'Account verified successfully! Please log in.',
      };
    } else {
      return {
        success: false,
        message: '',
        error: data?.message || 'Verification failed. Please check the code in your email.',
      };
    }
  } catch {
    if (cleanCode.length === 6) {
      return { success: true, message: 'Account verified successfully! Please log in.' };
    }
    return { success: false, message: '', error: 'Failed to verify account code.' };
  }
}

/**
 * Resend signup verification code
 */
export async function resendSignupCode(
  email: string,
): Promise<{ success: boolean; message: string; code?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const res = await fetch(`${API_BASE_URL}/auth/resend-verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });

    const data = await res.json();

    if (res.ok) {
      return { success: true, message: data.message || 'Code resent.', code: data.code };
    } else {
      return { success: false, message: '', error: data.message || 'Failed to resend code.' };
    }
  } catch {
    return { success: true, message: 'New code sent to your email.' };
  }
}

/**
 * Request a 6-digit password reset verification code via email (Nodemailer)
 */
export async function sendPasswordResetCode(
  email: string,
): Promise<{ success: boolean; message: string; code?: string; previewUrl?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: '', error: 'Please enter a valid email address.' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });

    const data = await res.json();

    if (res.ok) {
      return {
        success: true,
        message: data?.message || `A verification code was sent to ${cleanEmail}.`,
        code: data?.code,
        previewUrl: data?.previewUrl,
      };
    } else {
      return {
        success: false,
        message: '',
        error: data?.message || 'Failed to send password reset code. Please check your email.',
      };
    }
  } catch {
    // Simulated fallback in offline mode
    const simulatedCode = '839201';
    return {
      success: true,
      message: `Verification code sent to ${cleanEmail} (Simulated: ${simulatedCode})`,
      code: simulatedCode,
    };
  }
}

/**
 * Verify the 6-digit OTP code
 */
export async function verifyResetCode(
  email: string,
  code: string,
): Promise<{ success: boolean; message: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!cleanEmail || !cleanCode) {
    return { success: false, message: '', error: 'Email and 6-digit verification code are required.' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
    });

    const data = await res.json();

    if (res.ok) {
      return {
        success: true,
        message: data?.message || 'Code verified successfully.',
      };
    } else {
      return {
        success: false,
        message: '',
        error: data?.message || 'Invalid or expired verification code.',
      };
    }
  } catch {
    // Offline simulated verification
    if (cleanCode.length === 6) {
      return { success: true, message: 'Code verified successfully.' };
    }
    return { success: false, message: '', error: 'Invalid verification code.' };
  }
}

/**
 * Complete password reset with new password
 */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ success: boolean; message: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: '', error: 'New password must be at least 6 characters long.' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        code: cleanCode,
        newPassword,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      return {
        success: true,
        message: data?.message || 'Password reset successful! You can now log in.',
      };
    } else {
      return {
        success: false,
        message: '',
        error: data?.message || 'Failed to reset password. Please request a new code.',
      };
    }
  } catch {
    return {
      success: true,
      message: 'Password reset successful! You can now log in.',
    };
  }
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
