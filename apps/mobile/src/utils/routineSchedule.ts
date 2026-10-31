/**
 * Medication Routine & Schedule Engine
 * Accurately determines:
 * 1. If dose is already taken today (from database DoseLogs or local intake)
 * 2. If medication is scheduled for today based on frequency, days of week, and dates
 * 3. If pills are available (pillsLeft > 0)
 * 4. Exact countdown and next scheduled dose target
 */

export interface RoutineStatusInfo {
  isScheduledToday: boolean;
  isTakenToday: boolean;
  isOutOfStock: boolean;
  pillsLeft: number;
  reason?: string;
  nextScheduledLabel?: string;
}

export interface DoseSlotInfo {
  slot: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | string;
  time: string;
}

/**
 * Extracts all daily dose slots for a medication (e.g. 1, 2, 3 times a day)
 */
export function getMedicationDoseSlots(med: any): DoseSlotInfo[] {
  if (!med) return [{ slot: 'Morning', time: '08:00 AM' }];

  if (med.times) {
    try {
      const parsed = typeof med.times === 'string' ? JSON.parse(med.times) : med.times;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => {
          if (typeof item === 'string') {
            return {
              slot: inferTimeSlot(item),
              time: item,
            };
          }
          return {
            slot: item.slot || item.timeSlot || inferTimeSlot(item.time || '08:00 AM'),
            time: item.time || '08:00 AM',
          };
        });
      }
    } catch {
      // ignore JSON parse error, fall back below
    }
  }

  return [{
    slot: med.timeSlot || 'Morning',
    time: med.time || '08:00 AM',
  }];
}

export function inferTimeSlot(timeStr: string): string {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 'Morning';
  let h = parseInt(match[1], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;

  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
}

/**
 * Checks if a medication dose (optionally for a specific time) has already been taken today
 */
export function isDoseTakenToday(
  med: any,
  localTakenKeys?: Set<string>,
  scheduledTime?: string
): boolean {
  if (!med) return false;

  const todayStr = new Date().toDateString();
  const timeToCheck = scheduledTime || med.time;

  // Check local dose keys
  if (localTakenKeys) {
    const keyWithTime = `${med.id}_${todayStr}_${timeToCheck}`;
    const simpleKeyWithTime = `${med.id}_${timeToCheck}`;
    const generalKey = `${med.id}_${todayStr}`;
    const simpleId = med.id;

    if (
      localTakenKeys.has(keyWithTime) ||
      localTakenKeys.has(simpleKeyWithTime) ||
      (scheduledTime ? false : localTakenKeys.has(generalKey) || localTakenKeys.has(simpleId))
    ) {
      return true;
    }
  }

  // Check database doseLogs
  if (med.doseLogs && Array.isArray(med.doseLogs)) {
    const hasTodayDbLog = med.doseLogs.some((log: any) => {
      if (log.status !== 'taken') return false;
      const logDate = new Date(log.takenAt || log.createdAt).toDateString();
      if (logDate !== todayStr) return false;
      if (timeToCheck && log.scheduledTime) {
        return log.scheduledTime.trim().toLowerCase() === timeToCheck.trim().toLowerCase();
      }
      return true;
    });
    if (hasTodayDbLog) return true;
  }

  return false;
}

/**
 * Validates if the medication is scheduled for today based on:
 * - Pill inventory (pillsLeft > 0)
 * - Start date & End date
 * - Day of week (selectedDays, frequency)
 */
export function checkRoutineForToday(
  med: any,
  now: Date = new Date(),
  localTakenKeys?: Set<string>,
  scheduledTime?: string
): RoutineStatusInfo {
  const pillsLeft = med.pillsLeft ?? 30;
  const isTaken = isDoseTakenToday(med, localTakenKeys, scheduledTime);

  // 1. Supply check: Out of stock (0 pills left)
  if (pillsLeft <= 0) {
    return {
      isScheduledToday: false,
      isTakenToday: false,
      isOutOfStock: true,
      pillsLeft: 0,
      reason: 'Supply exhausted (0 pills left). Please refill to resume alarm.',
      nextScheduledLabel: 'Refill Needed',
    };
  }

  // 2. Start & End date check
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (med.startDate) {
    const cleanStart = String(med.startDate).replace(/^Today,\s*/i, '');
    const startDate = new Date(cleanStart);
    if (!isNaN(startDate.getTime()) && todayStart < startDate.getTime()) {
      return {
        isScheduledToday: false,
        isTakenToday: false,
        isOutOfStock: false,
        pillsLeft,
        reason: `Routine starts on ${med.startDate}`,
        nextScheduledLabel: `Starts ${med.startDate}`,
      };
    }
  }

  if (med.endDate && !String(med.endDate).toLowerCase().includes('ongoing')) {
    const cleanEnd = String(med.endDate).replace(/^Today,\s*/i, '');
    const endDate = new Date(cleanEnd);
    if (!isNaN(endDate.getTime())) {
      const endOfDay = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23,
        59,
        59
      ).getTime();
      if (todayStart > endOfDay) {
        return {
          isScheduledToday: false,
          isTakenToday: false,
          isOutOfStock: false,
          pillsLeft,
          reason: `Routine ended on ${med.endDate}`,
          nextScheduledLabel: 'Routine Ended',
        };
      }
    }
  }

  // 3. Frequency & Day of week check
  const freq = String(med.frequency || '').toLowerCase().trim();
  const dayNameShort = now.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon", "Tue", ...
  const dayIndex = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // "As needed" routine -> User takes manually, no automatic ringing alarm
  if (freq.includes('as needed')) {
    return {
      isScheduledToday: true,
      isTakenToday: isTaken,
      isOutOfStock: false,
      pillsLeft,
      reason: 'Taken as needed (PRN)',
      nextScheduledLabel: 'As needed',
    };
  }

  // Weekdays (Mon - Fri)
  if (
    (freq.includes('mon') && (freq.includes('fri') || freq.includes('weekdays'))) ||
    freq === 'mon – fri' ||
    freq === 'mon - fri'
  ) {
    const isWeekday = dayIndex >= 1 && dayIndex <= 5;
    if (!isWeekday) {
      return {
        isScheduledToday: false,
        isTakenToday: false,
        isOutOfStock: false,
        pillsLeft,
        reason: 'Scheduled on weekdays only (Mon – Fri)',
        nextScheduledLabel: 'Next: Monday',
      };
    }
    return {
      isScheduledToday: true,
      isTakenToday: isTaken,
      isOutOfStock: false,
      pillsLeft,
    };
  }

  // Specific days list (selectedDays)
  let daysList: string[] = [];
  if (Array.isArray(med.selectedDays)) {
    daysList = med.selectedDays;
  } else if (typeof med.selectedDays === 'string') {
    try {
      daysList = JSON.parse(med.selectedDays);
    } catch {
      daysList = med.selectedDays.split(',').map((s: string) => s.trim());
    }
  }

  if (
    daysList.length > 0 &&
    !freq.includes('every day') &&
    !freq.includes('daily')
  ) {
    const isScheduledOnThisDay = daysList.some((d) =>
      d.toLowerCase().startsWith(dayNameShort.toLowerCase().slice(0, 3))
    );
    if (!isScheduledOnThisDay) {
      return {
        isScheduledToday: false,
        isTakenToday: false,
        isOutOfStock: false,
        pillsLeft,
        reason: `Scheduled on: ${daysList.join(', ')}`,
        nextScheduledLabel: `Next: ${daysList[0]}`,
      };
    }
  }

  return {
    isScheduledToday: true,
    isTakenToday: isTaken,
    isOutOfStock: false,
    pillsLeft,
  };
}

