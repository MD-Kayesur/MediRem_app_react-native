import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Network from 'expo-network';
import { scheduleMedicationReminder, cancelMedicationReminder } from './notifications';
import { getApiBaseUrl } from '@/redux/api/apiSlice';

export const OFFLINE_QUEUE_KEY = '@medirem_offline_queue';
export const CACHED_MEDS_PREFIX = '@medirem_cached_meds_';
export const CACHED_DOSES_PREFIX = '@medirem_cached_doses_';

export type OfflineActionType =
  | 'CREATE_MEDICATION'
  | 'UPDATE_MEDICATION'
  | 'DELETE_MEDICATION'
  | 'TAKE_DOSE';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: any;
  userId?: string;
  userEmail?: string;
  tempMedId?: string;
  createdAt: string;
  retryCount: number;
}

// In-memory cache for ultra-fast synchronous UI responses
const memoryMedsCache: Record<string, any[]> = {};
let isSyncInProgress = false;

/**
 * Check if the device currently has active internet connectivity
 */
export async function checkIsOnline(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  }

  try {
    const netState = await Network.getNetworkStateAsync();
    const isConn = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    return isConn;
  } catch (err) {
    console.warn('[OfflineSync] Network check fallback:', err);
    return true;
  }
}

/**
 * Get cached medications for a user from memory or AsyncStorage
 */
export async function getCachedMedications(userId = 'default'): Promise<any[]> {
  if (memoryMedsCache[userId] && memoryMedsCache[userId].length > 0) {
    return memoryMedsCache[userId];
  }

  try {
    const raw = await AsyncStorage.getItem(`${CACHED_MEDS_PREFIX}${userId}`);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryMedsCache[userId] = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[OfflineSync] getCachedMedications error:', err);
  }

  return memoryMedsCache[userId] || [];
}

/**
 * Save cached medications for a user
 */
export async function setCachedMedications(userId = 'default', meds: any[]): Promise<void> {
  memoryMedsCache[userId] = meds;
  try {
    await AsyncStorage.setItem(`${CACHED_MEDS_PREFIX}${userId}`, JSON.stringify(meds));
  } catch (err) {
    console.warn('[OfflineSync] setCachedMedications error:', err);
  }
}

/**
 * Add or update a medication in the local cache immediately (works 100% offline)
 */
export async function saveLocalMedication(userId = 'default', med: any): Promise<any[]> {
  const current = await getCachedMedications(userId);
  const existsIndex = current.findIndex((m: any) => m.id === med.id);
  let updated: any[];

  if (existsIndex >= 0) {
    updated = [...current];
    updated[existsIndex] = { ...updated[existsIndex], ...med };
  } else {
    updated = [med, ...current];
  }

  await setCachedMedications(userId, updated);

  // Arm device alarm immediately
  if (med.alarmEnabled !== false && med.time) {
    try {
      await scheduleMedicationReminder({
        id: med.id,
        name: med.name,
        dosage: med.dosage || '1 dose',
        timeStr: med.time,
        instructions: med.instructions,
      });
    } catch (e) {
      console.warn('[OfflineSync] Schedule reminder error:', e);
    }
  }

  return updated;
}

/**
 * Update partial medication in local cache
 */
export async function updateLocalMedication(
  userId = 'default',
  id: string,
  updates: any
): Promise<any[]> {
  const current = await getCachedMedications(userId);
  const updated = current.map((m: any) => (m.id === id ? { ...m, ...updates } : m));
  await setCachedMedications(userId, updated);

  const target = updated.find((m: any) => m.id === id);
  if (target && target.alarmEnabled !== false && target.time) {
    scheduleMedicationReminder({
      id: target.id,
      name: target.name,
      dosage: target.dosage || '1 dose',
      timeStr: target.time,
      instructions: target.instructions,
    }).catch(() => {});
  }

  return updated;
}

/**
 * Delete a medication from local cache
 */
export async function deleteLocalMedication(userId = 'default', id: string): Promise<any[]> {
  const current = await getCachedMedications(userId);
  const updated = current.filter((m: any) => m.id !== id);
  await setCachedMedications(userId, updated);

  cancelMedicationReminder(id).catch(() => {});
  return updated;
}

/**
 * Record a dose as taken locally (decrements pill count immediately)
 */
export async function takeDoseLocally(userId = 'default', medId: string): Promise<any[]> {
  const current = await getCachedMedications(userId);
  const updated = current.map((m: any) => {
    if (m.id === medId) {
      const nextPills = Math.max(0, (m.pillsLeft ?? m.totalPills ?? 1) - 1);
      return { ...m, pillsLeft: nextPills };
    }
    return m;
  });
  await setCachedMedications(userId, updated);
  return updated;
}

/**
 * Get all queued offline actions
 */
export async function getOfflineQueue(): Promise<OfflineAction[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[OfflineSync] getOfflineQueue error:', err);
  }
  return [];
}

/**
 * Enqueue an offline action to be synchronized when online
 */
export async function enqueueOfflineAction(
  action: Omit<OfflineAction, 'id' | 'createdAt' | 'retryCount'>
): Promise<OfflineAction> {
  const newAction: OfflineAction = {
    ...action,
    id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  const queue = await getOfflineQueue();
  queue.push(newAction);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  console.log(`[OfflineSync] 📥 Enqueued offline action: ${newAction.type} (${newAction.id})`);
  return newAction;
}

/**
 * Remove an action from the queue once successfully synced
 */
export async function removeOfflineAction(actionId: string): Promise<void> {
  const queue = await getOfflineQueue();
  const updated = queue.filter((a) => a.id !== actionId);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
}

/**
 * Process and synchronize all queued offline actions to Neon Cloud PostgreSQL backend
 */
export async function syncOfflineQueue(authToken?: string | null): Promise<{
  synced: number;
  remaining: number;
}> {
  if (isSyncInProgress) return { synced: 0, remaining: 0 };

  const isOnline = await checkIsOnline();
  if (!isOnline) {
    console.log('[OfflineSync] Device is offline. Sync postponed.');
    return { synced: 0, remaining: (await getOfflineQueue()).length };
  }

  isSyncInProgress = true;
  const baseUrl = getApiBaseUrl();
  const queue = await getOfflineQueue();

  if (queue.length === 0) {
    isSyncInProgress = false;
    return { synced: 0, remaining: 0 };
  }

  console.log(`[OfflineSync] 🔄 Starting sync for ${queue.length} offline actions to ${baseUrl}`);
  let syncedCount = 0;

  for (const action of queue) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      if (action.userId) {
        headers['x-user-id'] = action.userId;
      }
      if (action.userEmail) {
        headers['x-user-email'] = action.userEmail;
      }

      let res: Response;

      switch (action.type) {
        case 'CREATE_MEDICATION': {
          res = await fetch(`${baseUrl}/medications`, {
            method: 'POST',
            headers,
            body: JSON.stringify(action.payload),
          });
          if (res.ok) {
            const created = await res.json();
            // If we have a temporary local offline ID, replace it with the real server ID
            if (action.tempMedId && action.userId) {
              const currentMeds = await getCachedMedications(action.userId);
              const replaced = currentMeds.map((m) =>
                m.id === action.tempMedId ? { ...m, id: created.id } : m
              );
              await setCachedMedications(action.userId, replaced);
            }
          }
          break;
        }

        case 'UPDATE_MEDICATION': {
          const medId = action.payload?.id;
          res = await fetch(`${baseUrl}/medications/${medId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(action.payload?.data || {}),
          });
          break;
        }

        case 'DELETE_MEDICATION': {
          const medId = action.payload?.id;
          res = await fetch(`${baseUrl}/medications/${medId}`, {
            method: 'DELETE',
            headers,
          });
          break;
        }

        case 'TAKE_DOSE': {
          const medId = action.payload?.id;
          res = await fetch(`${baseUrl}/medications/${medId}/take-dose`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ scheduledTime: action.payload?.scheduledTime }),
          });
          break;
        }

        default:
          res = { ok: true } as Response;
          break;
      }

      if (res && (res.ok || res.status === 404)) {
        await removeOfflineAction(action.id);
        syncedCount++;
        console.log(`[OfflineSync] ✅ Action ${action.type} (${action.id}) synced successfully.`);
      } else {
        console.warn(`[OfflineSync] ⚠️ Action ${action.type} failed with status: ${res?.status}`);
      }
    } catch (err) {
      console.warn(`[OfflineSync] ⚠️ Network error while syncing action ${action.id}:`, err);
      // Stop on network failure to avoid out-of-order execution
      break;
    }
  }

  isSyncInProgress = false;
  const remainingQueue = await getOfflineQueue();
  console.log(`[OfflineSync] 🏁 Sync completed: ${syncedCount} synced, ${remainingQueue.length} remaining.`);
  return { synced: syncedCount, remaining: remainingQueue.length };
}
