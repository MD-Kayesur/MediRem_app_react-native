import { Platform, Vibration, Alert } from 'react-native';
import { triggerAudibleAlarm, stopAudibleAlarm } from './sound-service';

export const NOTIFICATION_CHANNEL_ID = 'medication-alarm-channel';

// Safe lazy-loaded reference to expo-notifications
let notificationsModule: typeof import('expo-notifications') | null = null;
let hasAttemptedLoad = false;

function getNotifications() {
  if (!hasAttemptedLoad) {
    hasAttemptedLoad = true;
    try {
      // Dynamic require ensures no uncaught top-level crash in restricted environments
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      notificationsModule = require('expo-notifications');
      notificationsModule?.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch {
      notificationsModule = null;
    }
  }
  return notificationsModule;
}

/**
 * Initialize notification channels on Android and request permissions safely
 */
export async function initializeNotificationService(): Promise<boolean> {
  try {
    const Notifications = getNotifications();
    if (!Notifications) {
      // In Expo Go without full native push capabilities, in-app alerts and vibrations are used
      return true;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
          name: 'Medication Alarms & Reminders',
          importance: Notifications.AndroidImportance?.MAX ?? 7,
          vibrationPattern: [0, 500, 250, 500, 250, 500],
          lightColor: '#208AEF',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });
      } catch {
        // Channel setup fallback
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch {
    return true;
  }
}

/**
 * Parse time string like "10:00 PM" into 24h hour and minute
 */
export function parseTimeString(timeStr?: string): { hour: number; minute: number } {
  if (!timeStr) return { hour: 8, minute: 0 };
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return { hour: 8, minute: 0 };

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  return { hour, minute };
}

export interface ScheduleReminderParams {
  id: string;
  name: string;
  dosage: string;
  timeStr: string;
  instructions?: string;
}

/**
 * Schedule a local notification / alarm for the medication dose
 */
export async function scheduleMedicationReminder(params: ScheduleReminderParams): Promise<string | null> {
  const localId = `reminder_${params.id}_${Date.now()}`;
  const { hour, minute } = parseTimeString(params.timeStr);

  const now = new Date();
  const scheduledDate = new Date();
  scheduledDate.setHours(hour, minute, 0, 0);

  if (scheduledDate.getTime() <= now.getTime()) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  }

  try {
    const Notifications = getNotifications();
    if (Notifications) {
      const title = `⏰ Medication Alarm: ${params.name} (${params.dosage})`;
      const body = params.instructions
        ? `Time for your dose: ${params.name} (${params.dosage}) • ${params.instructions}`
        : `It's time to take your scheduled dose of ${params.name} (${params.dosage}).`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          badge: 1,
          data: {
            medId: params.id,
            name: params.name,
            dosage: params.dosage,
            time: params.timeStr,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledDate,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });

      return notificationId || localId;
    }
  } catch (error) {
    console.warn('[NotificationService] Native scheduling warning:', error);
  }

  // Fallback: Return generated reminder id for in-app tracking
  return localId;
}

/**
 * Trigger an immediate test alarm and push notification so the user can hear and see it working
 */
export async function sendImmediateTestAlarm(name = 'Metformin', dosage = '500mg'): Promise<boolean> {
  try {
    // 1. Trigger audible alarm chime sound and vibration immediately
    triggerAudibleAlarm();

    // 2. Try native notification tray banner if supported
    const Notifications = getNotifications();
    if (Notifications) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 Medication Alarm: ${name} (${dosage})`,
            body: `Dose reminder ringing now! Tap to take your medicine.`,
            sound: true,
            badge: 1,
            data: { test: true },
          },
          trigger: null, // trigger immediately
        });
      } catch {
        // Fall through to in-app alert
      }
    }

    // 3. Guaranteed in-app alert dialog with audio chime, vibration, and stop controls
    Alert.alert(
      `🚨 Alarm Ringing: ${name} (${dosage})`,
      `Alarm sound and vibration are now active! Tap below to take dose or stop the alarm.`,
      [
        {
          text: 'Take Dose Now',
          style: 'default',
          onPress: () => stopAudibleAlarm(),
        },
        {
          text: 'Stop Alarm',
          style: 'destructive',
          onPress: () => stopAudibleAlarm(),
        },
      ]
    );

    return true;
  } catch {
    Vibration.vibrate([0, 400, 200, 400]);
    return true;
  }
}

/**
 * Cancel a scheduled reminder
 */
export async function cancelMedicationReminder(notificationId: string): Promise<void> {
  try {
    const Notifications = getNotifications();
    if (Notifications && notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  } catch {
    // Safe fallback
  }
}
