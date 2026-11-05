import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Network from 'expo-network';
import { getApiBaseUrl } from '@/redux/api/apiSlice';

/**
 * Cooldown threshold (5 minutes). Render stays awake for ~15 minutes after a hit.
 */
const WARMUP_COOLDOWN_MS = 5 * 60 * 1000;

let lastWarmupSuccessTime = 0;
let isWarmupInProgress = false;
let warmupAbortController: AbortController | null = null;

/**
 * Check if the device is currently connected to the network
 */
async function isDeviceConnected(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
  try {
    const netState = await Network.getNetworkStateAsync();
    return Boolean(netState.isConnected && netState.isInternetReachable !== false);
  } catch {
    return true;
  }
}

/**
 * Silently pings the Render backend /api/health endpoint in the background.
 *
 * Why this is needed:
 * Render Free Tier containers spin down ("sleep") after 15 minutes of inactivity.
 * Cold start takes 30-50 seconds to boot the server and connect to Neon PostgreSQL.
 * By firing this background ping immediately when the app opens or network reconnects:
 *   1. Render boots up immediately in the background while the user reads/navigates.
 *   2. Neon DB connection pool is established before the user clicks "Sign In".
 *   3. The user experiences zero or drastically reduced login wait time!
 *
 * @param force If true, ignores the 5-minute cooldown and pings anyway.
 */
export async function warmupBackend(force = false): Promise<boolean> {
  const now = Date.now();

  // If already warmed up recently and not forced, backend is already hot!
  if (!force && lastWarmupSuccessTime > 0 && now - lastWarmupSuccessTime < WARMUP_COOLDOWN_MS) {
    return true;
  }

  // Prevent duplicate concurrent requests
  if (isWarmupInProgress) {
    return false;
  }

  // Don't attempt if device is offline
  const online = await isDeviceConnected();
  if (!online) {
    return false;
  }

  isWarmupInProgress = true;
  const baseUrl = getApiBaseUrl();
  const healthUrl = `${baseUrl}/health`;

  try {
    if (warmupAbortController) {
      warmupAbortController.abort();
    }
    warmupAbortController = new AbortController();

    // 45-second timeout covers Render free tier cold-start wake time
    const timeoutId = setTimeout(() => {
      try {
        warmupAbortController?.abort();
      } catch {}
    }, 45000);

    const startTime = Date.now();
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Client-Warmup': 'true',
      },
      signal: warmupAbortController.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      lastWarmupSuccessTime = Date.now();
      const elapsed = Date.now() - startTime;
      console.log(`[BackendWarmup] ✅ Backend & Neon DB are hot and connected! (took ${elapsed}ms)`);
      return true;
    } else {
      console.warn(`[BackendWarmup] Warmup response status: ${res.status}`);
      return false;
    }
  } catch (err: any) {
    // Silent fail; do not disturb user or crash app
    if (err.name === 'AbortError') {
      console.warn('[BackendWarmup] Warmup ping timed out (Render still spinning up).');
    } else {
      console.warn('[BackendWarmup] Warmup ping error (silently handled):', err?.message || err);
    }
    return false;
  } finally {
    isWarmupInProgress = false;
  }
}

/**
 * Initializes listeners to automatically keep the backend warm:
 * - On app launch
 * - When app returns from background to foreground
 */
export function initializeBackendWarmup(): () => void {
  // 1. Warm up immediately upon initialization
  warmupBackend().catch(() => {});

  // 2. Warm up whenever the user brings the app back to foreground
  let currentAppState = AppState.currentState;
  const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (currentAppState && /inactive|background/.test(currentAppState) && nextAppState === 'active') {
      warmupBackend().catch(() => {});
    }
    currentAppState = nextAppState;
  });

  return () => {
    subscription.remove();
  };
}
