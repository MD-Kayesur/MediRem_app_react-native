import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import {
  CalendarPickerModal,
  TimePickerModal,
} from '@/components/date-time-picker-modal';
import {
  scheduleMedicationReminder,
  cancelMedicationReminder,
} from '@/services/notification-service';
import {
  triggerAudibleAlarm,
  stopAudibleAlarm,
  subscribeToAlarmState,
} from '@/services/sound-service';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  frequency: string;
  selectedDays?: string[];
  startDate?: string;
  endDate?: string;
  time: string;
  timeSlot: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  nextDose: string;
  pillsLeft: number;
  totalPills: number;
  imageUri?: string;
  refillWarning?: string;
  status: 'active' | 'paused';
  alarmEnabled?: boolean;
  notificationId?: string;
}

const INITIAL_MEDS: Medication[] = [
  {
    id: '1',
    name: 'Metformin',
    dosage: '500mg',
    instructions: 'After food',
    frequency: 'Every day',
    startDate: 'May 1, 2026',
    endDate: 'Ongoing',
    time: '01:00 PM',
    timeSlot: 'Afternoon',
    nextDose: 'Today, 1:00 PM',
    pillsLeft: 18,
    totalPills: 30,
    status: 'active',
    alarmEnabled: true,
  },
  {
    id: '2',
    name: 'Paracetamol',
    dosage: '500mg',
    instructions: 'With water',
    frequency: 'As needed',
    startDate: 'May 1, 2026',
    endDate: 'Ongoing',
    time: '08:00 AM',
    timeSlot: 'Morning',
    nextDose: 'Today, 08:00 AM',
    pillsLeft: 24,
    totalPills: 30,
    status: 'active',
    alarmEnabled: true,
  },
  {
    id: '3',
    name: 'Vitamin D3',
    dosage: '1000IU',
    instructions: 'With breakfast',
    frequency: 'Daily',
    startDate: 'Apr 15, 2026',
    endDate: 'Ongoing',
    time: '01:00 PM',
    timeSlot: 'Afternoon',
    nextDose: 'Today, 01:00 PM',
    pillsLeft: 45,
    totalPills: 60,
    status: 'active',
    alarmEnabled: true,
  },
  {
    id: '4',
    name: 'Atorvastatin',
    dosage: '10mg',
    instructions: 'Bedtime',
    frequency: 'Every night',
    startDate: 'Apr 20, 2026',
    endDate: 'Ongoing',
    time: '10:00 PM',
    timeSlot: 'Night',
    nextDose: 'Tonight, 10:00 PM',
    pillsLeft: 12,
    totalPills: 30,
    status: 'active',
    alarmEnabled: true,
  },
];

const DAYS_OF_WEEK = [
  { label: 'Mon', key: 'Mon' },
  { label: 'Tue', key: 'Tue' },
  { label: 'Wed', key: 'Wed' },
  { label: 'Thu', key: 'Thu' },
  { label: 'Fri', key: 'Fri' },
  { label: 'Sat', key: 'Sat' },
  { label: 'Sun', key: 'Sun' },
];

const TIME_SLOTS: {
  slot: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  defaultTime: string;
  icon: any;
  color: string;
}[] = [
  { slot: 'Morning', defaultTime: '08:00 AM', icon: 'sunny', color: '#10B981' },
  { slot: 'Afternoon', defaultTime: '01:00 PM', icon: 'partly-sunny', color: '#208AEF' },
  { slot: 'Evening', defaultTime: '07:00 PM', icon: 'cloudy-night', color: '#F59E0B' },
  { slot: 'Night', defaultTime: '10:00 PM', icon: 'moon', color: '#6366F1' },
];

export interface CountdownInfo {
  text: string;
  label: string;
  isDue: boolean;
  isLate: boolean;
  isUrgent: boolean;
  isDoneToday: boolean;
  lateSecs: number;
}

function getNextDoseTarget(timeStr?: string, isDoneToday: boolean = false): Date {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      target.setHours(h, m, 0, 0);

      // If dose is taken/stopped for today, target tomorrow!
      if (isDoneToday) {
        target.setDate(target.getDate() + 1);
        return target;
      }

      // If not taken today, return today's scheduled dose time!
      // This preserves exact late time calculation!
      return target;
    }
  }

  // Fallback to end of day if parse fails
  target.setHours(20, 0, 0, 0);
  if (isDoneToday) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

function getCountdownInfo(
  timeStr: string | undefined,
  now: Date,
  isPaused: boolean,
  isDoneToday: boolean = false
): CountdownInfo {
  if (isPaused) {
    return {
      text: 'Paused',
      label: 'Routine Status:',
      isDue: false,
      isLate: false,
      isUrgent: false,
      isDoneToday: false,
      lateSecs: 0,
    };
  }

  const target = getNextDoseTarget(timeStr, isDoneToday);
  const diffMs = target.getTime() - now.getTime();
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Case 1: Already taken or permanently stopped for today -> target is TOMORROW!
  if (isDoneToday) {
    const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const text = hours > 0
      ? `${hours}h ${pad(mins)}m ${pad(secs)}s`
      : `${pad(mins)}m ${pad(secs)}s`;

    return {
      text,
      label: '✓ Dose Taken Today',
      isDue: false,
      isLate: false,
      isUrgent: false,
      isDoneToday: true,
      lateSecs: 0,
    };
  }

  // Case 2: Past scheduled dose time (LATE / OVERDUE!)
  // Scheduled time arrived or passed, and not taken yet!
  if (diffMs <= 0) {
    const lateSecs = Math.floor(Math.abs(diffMs) / 1000);
    const lateHours = Math.floor(lateSecs / 3600);
    const lateMins = Math.floor((lateSecs % 3600) / 60);
    const lateSecsRem = lateSecs % 60;

    let lateText: string;
    if (lateHours > 0) {
      lateText = `${lateHours}h ${pad(lateMins)}m ${pad(lateSecsRem)}s`;
    } else {
      lateText = `${pad(lateMins)}m ${pad(lateSecsRem)}s`;
    }

    return {
      text: lateText,
      label: '⚠️ Late by:',
      isDue: true,
      isLate: true,
      isUrgent: true,
      isDoneToday: false,
      lateSecs,
    };
  }

  // Case 3: Future scheduled dose time (REMAINING TIME!)
  const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const text = hours > 0
    ? `${hours}h ${pad(mins)}m ${pad(secs)}s`
    : `${pad(mins)}m ${pad(secs)}s`;

  return {
    text,
    label: 'Remaining Time:',
    isDue: false,
    isLate: false,
    isUrgent: hours === 0 && mins <= 10,
    isDoneToday: false,
    lateSecs: 0,
  };
}

function getDoseKey(medId: string, timeStr?: string, date?: Date): string {
  const d = date || new Date();
  return `${medId}_${d.toDateString()}_${timeStr || 'default'}`;
}

function getRoutineDurationInfo(startDateStr?: string, endDateStr?: string): {
  isOngoing: boolean;
  daysRemaining: number | null;
  summaryText: string;
} {
  if (!endDateStr || endDateStr.toLowerCase().includes('ongoing')) {
    return {
      isOngoing: true,
      daysRemaining: null,
      summaryText: 'Ongoing routine',
    };
  }

  // Parse endDateStr like "Nov 4, 2026" or "Today, Nov 4, 2026"
  const cleanEnd = endDateStr.replace(/^.*,\s*/i, '').trim();
  const end = new Date(cleanEnd);
  if (isNaN(end.getTime())) {
    return {
      isOngoing: false,
      daysRemaining: null,
      summaryText: endDateStr,
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = end.getTime() - todayStart.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return {
    isOngoing: false,
    daysRemaining,
    summaryText:
      daysRemaining === 0
        ? 'Ends today'
        : daysRemaining === 1
        ? '1 day left in routine'
        : `${daysRemaining} days left in routine`,
  };
}

export default function MedsScreen() {
  const [meds, setMeds] = useState<Medication[]>(INITIAL_MEDS);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Live countdown timer ticker (ticks every 1s)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Active Ringing Alarm state & 3-minute Persistent Repeat Loop
  const [activeAlarmMed, setActiveAlarmMed] = useState<Medication | null>(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [isSnoozed3m, setIsSnoozed3m] = useState(false);
  const [ringSecondsLeft, setRingSecondsLeft] = useState(60); // 1 full minute of continuous ringing
  const [snoozeSecondsLeft, setSnoozeSecondsLeft] = useState(180); // 3 minutes between repeats
  const [isAlarmModalVisible, setIsAlarmModalVisible] = useState(false);

  // Permanently stopped dose keys: will NEVER alarm again after 3 minutes
  const [permanentlyStoppedKeys, setPermanentlyStoppedKeys] = useState<Set<string>>(() => new Set());
  // Dose keys that have been taken today
  const [takenDoseKeys, setTakenDoseKeys] = useState<Set<string>>(() => new Set());
  const activeDoseKeyRef = useRef<string>('');

  // Subscribe to audio alarm playing state
  useEffect(() => {
    const unsubscribe = subscribeToAlarmState((playing) => {
      setIsAlarmPlaying(playing);
    });
    return () => unsubscribe();
  }, []);

  // 1-minute Continuous Ringing & 3-minute Snooze Repeat Ticker
  useEffect(() => {
    if (!activeAlarmMed) return;

    const interval = setInterval(() => {
      if (isAlarmPlaying) {
        // Continuous ringing phase (60 seconds)
        setRingSecondsLeft((prev) => {
          if (prev <= 1) {
            // 1 full minute of continuous ringing has completed!
            stopAudibleAlarm();
            // Automatically switch to 3-minute snooze repeat cycle!
            setIsSnoozed3m(true);
            setSnoozeSecondsLeft(180);
            return 0;
          }
          return prev - 1;
        });
      } else if (isSnoozed3m) {
        // 3-minute waiting phase before re-alarming
        setSnoozeSecondsLeft((prev) => {
          if (prev <= 1) {
            // 3 minutes have elapsed! Ring continuously for another full 1 minute!
            setIsSnoozed3m(false);
            setRingSecondsLeft(60);
            setIsAlarmModalVisible(true);
            triggerAudibleAlarm();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeAlarmMed, isAlarmPlaying, isSnoozed3m]);

  // Automatic Due-Time Alarm Detection: sounds chime and opens alarm when dose is due
  useEffect(() => {
    meds.forEach((med) => {
      if (med.status === 'active' && med.alarmEnabled !== false) {
        const doseKey = getDoseKey(med.id, med.time, currentTime);
        const isDone = takenDoseKeys.has(doseKey) || permanentlyStoppedKeys.has(doseKey);
        // If already taken or permanently stopped for today, NEVER ring again!
        if (isDone) {
          return;
        }

        const info = getCountdownInfo(med.time, currentTime, false, false);
        if (info.isDue) {
          // If not currently tracking this dose, trigger 1-minute continuous alarm
          if (activeAlarmMed?.id !== med.id) {
            activeDoseKeyRef.current = doseKey;
            setActiveAlarmMed(med);
            setRingSecondsLeft(60);
            setIsSnoozed3m(false);
            setIsAlarmModalVisible(true);
            triggerAudibleAlarm();
          }
        }
      }
    });
  }, [currentTime, meds, activeAlarmMed, takenDoseKeys, permanentlyStoppedKeys]);

  // New med form state
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [pillsCount, setPillsCount] = useState('30');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Routine Days & Time State
  const [frequencyType, setFrequencyType] = useState<'everyday' | 'weekdays' | 'specific' | 'asneeded'>('everyday');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Night'>('Morning');
  const [customTime, setCustomTime] = useState('08:00 AM');

  // Calendar & Time Picker Modals State
  const formatDisplayDate = (d: Date) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const [selectedStartDate, setSelectedStartDate] = useState<Date>(() => new Date());
  const [startDateFormatted, setStartDateFormatted] = useState(() => `Today, ${formatDisplayDate(new Date())}`);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);

  const [isOngoing, setIsOngoing] = useState(true);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [endDateFormatted, setEndDateFormatted] = useState('Ongoing (No end date)');
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(true);

  const handleSelectEndDatePreset = (days: number | 'ongoing') => {
    if (days === 'ongoing') {
      setIsOngoing(true);
      setEndDateFormatted('Ongoing (No end date)');
      setSelectedEndDate(null);
      setPillsCount('30');
    } else {
      setIsOngoing(false);
      const target = new Date(selectedStartDate.getTime());
      target.setDate(target.getDate() + days);
      setSelectedEndDate(target);
      setEndDateFormatted(formatDisplayDate(target));
      // Automatically set pills count to match the routine duration!
      setPillsCount(days.toString());
    }
  };

  const handleTakePillDose = (medId: string) => {
    const med = meds.find((m) => m.id === medId);
    if (!med) return;

    const doseKey = getDoseKey(med.id, med.time, currentTime);

    // If this med is ringing or snoozed, stop it immediately
    if (activeAlarmMed?.id === medId) {
      stopAudibleAlarm();
      setIsAlarmModalVisible(false);
      setActiveAlarmMed(null);
      setIsSnoozed3m(false);
    }

    // Mark dose as taken and permanently stopped for today
    setTakenDoseKeys((prev) => new Set(prev).add(doseKey));
    setPermanentlyStoppedKeys((prev) => new Set(prev).add(doseKey));

    setMeds((prev) =>
      prev.map((m) => {
        if (m.id === medId && m.pillsLeft > 0) {
          const nextCount = m.pillsLeft - 1;
          const isLow = nextCount <= 5;
          return {
            ...m,
            pillsLeft: nextCount,
            refillWarning: isLow ? `Refill Alert: Only ${nextCount} pills remaining!` : undefined,
          };
        }
        return m;
      })
    );

    Alert.alert(
      'Dose Taken! 💊',
      `You marked ${med.name} (${med.dosage}) as taken for today.\n\n✓ The red due alert is removed.\n✓ Alarm stopped permanently: will NOT alarm again today.\n✓ Next dose is scheduled for tomorrow at ${med.time}.`
    );
  };

  const handleAdjustPillCount = (medId: string, delta: number) => {
    setMeds((prev) =>
      prev.map((m) => {
        if (m.id === medId) {
          const nextCount = Math.max(0, m.pillsLeft + delta);
          const nextTotal = Math.max(nextCount, m.totalPills);
          const isLow = nextCount <= 5 && nextCount > 0;
          return {
            ...m,
            pillsLeft: nextCount,
            totalPills: nextTotal,
            refillWarning: isLow ? `Refill Alert: Only ${nextCount} pills remaining!` : undefined,
          };
        }
        return m;
      })
    );
  };

  const handleRefillMed = (medId: string) => {
    setMeds((prev) =>
      prev.map((m) => {
        if (m.id === medId) {
          return {
            ...m,
            pillsLeft: m.totalPills,
            refillWarning: undefined,
          };
        }
        return m;
      })
    );
    Alert.alert('Supply Refilled! 💊', 'Pill supply reset to full capacity.');
  };

  const handleSyncToRoutine = (medId: string, routineDays: number) => {
    setMeds((prev) =>
      prev.map((m) => {
        if (m.id === medId) {
          return {
            ...m,
            pillsLeft: routineDays,
            totalPills: routineDays,
            refillWarning: undefined,
          };
        }
        return m;
      })
    );
    Alert.alert(
      'Supply Synced to Routine! 💊',
      `Supply updated to ${routineDays} pills to match your ${routineDays}-day routine perfectly.`
    );
  };

  // Start 1-minute continuous alarm ringing (for testing)
  const handleTriggerMedAlarm = (med: Medication) => {
    const doseKey = getDoseKey(med.id, med.time, currentTime);
    setPermanentlyStoppedKeys((prev) => {
      const next = new Set(prev);
      next.delete(doseKey);
      return next;
    });
    setTakenDoseKeys((prev) => {
      const next = new Set(prev);
      next.delete(doseKey);
      return next;
    });
    activeDoseKeyRef.current = doseKey;
    setActiveAlarmMed(med);
    setRingSecondsLeft(60);
    setIsSnoozed3m(false);
    setIsAlarmModalVisible(true);
    triggerAudibleAlarm();
  };

  // Permanently stop when taking the dose: will NEVER repeat after 3 minutes & removes red due alert
  const handleTakeAlarmDosePermanent = (med: Medication) => {
    stopAudibleAlarm();
    const doseKey = activeDoseKeyRef.current || getDoseKey(med.id, med.time, currentTime);
    setTakenDoseKeys((prev) => new Set(prev).add(doseKey));
    setPermanentlyStoppedKeys((prev) => new Set(prev).add(doseKey));
    setIsSnoozed3m(false);
    setIsAlarmModalVisible(false);
    setActiveAlarmMed(null);

    setMeds((prev) =>
      prev.map((m) =>
        m.id === med.id
          ? {
              ...m,
              pillsLeft: Math.max(0, m.pillsLeft - 1),
              refillWarning: m.pillsLeft - 1 <= 5 ? `Refill Alert: Only ${Math.max(0, m.pillsLeft - 1)} pills remaining!` : undefined,
            }
          : m
      )
    );
    Alert.alert(
      'Dose Recorded! 💊',
      `You marked ${med.name} (${med.dosage}) as taken.\n\n✓ The red due alert is removed.\n✓ Alarm stopped permanently: will NOT repeat or alarm again today.\n✓ Next dose scheduled for tomorrow at ${med.time}.`
    );
  };

  // Permanently stop alarm: will NEVER repeat after 3 minutes & removes red due alert
  const handleStopAlarmPermanent = () => {
    stopAudibleAlarm();
    const key = activeDoseKeyRef.current || (activeAlarmMed ? getDoseKey(activeAlarmMed.id, activeAlarmMed.time, currentTime) : '');
    if (key) {
      setPermanentlyStoppedKeys((prev) => new Set(prev).add(key));
    }
    setIsSnoozed3m(false);
    setIsAlarmModalVisible(false);
    setActiveAlarmMed(null);
    Alert.alert(
      'Alarm Stopped Permanently 🔕',
      'The alarm is completely turned off for today\'s dose.\n\n✓ The red due alert is removed.\n✓ It will NEVER alarm again today.'
    );
  };

  // Snooze for 3 minutes: will continuously ring again for 1 full minute in 3 mins
  const handleSnooze3Minutes = () => {
    stopAudibleAlarm();
    setIsSnoozed3m(true);
    setSnoozeSecondsLeft(180);
    setIsAlarmModalVisible(false);
    Alert.alert(
      'Alarm Snoozed for 3 Minutes ⏰',
      'Silenced for now. The alarm will continuously ring for 1 full minute in exactly 3 minutes unless stopped permanently.'
    );
  };

  const handleOpenAlarmModal = () => {
    setIsAlarmModalVisible(true);
  };

  const handleTestAlarm = async () => {
    const testMed: Medication = {
      id: 'test-preview',
      name: name.trim() || 'Scheduled Medicine',
      dosage: dosage.trim() || '1 Dose',
      instructions: instructions.trim() || 'As prescribed',
      frequency: frequencyType === 'everyday' ? 'Every day' : 'Scheduled Routine',
      time: customTime,
      timeSlot: selectedTimeSlot,
      nextDose: 'Right Now',
      pillsLeft: parseInt(pillsCount, 10) || 30,
      totalPills: parseInt(pillsCount, 10) || 30,
      imageUri: imageUri || undefined,
      status: 'active',
      alarmEnabled: true,
    };
    handleTriggerMedAlarm(testMed);
  };

  const handleTestCardAlarm = (med: Medication) => {
    handleTriggerMedAlarm(med);
  };

  const filteredMeds = meds.filter((m) => {
    const matchesFilter = filter === 'all' || m.status === filter;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.dosage.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Photo Pickers
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow gallery access to select a medication photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Unable to pick photo from gallery.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take a photo of your medication.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Unable to launch camera.');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Medication Photo',
      'Choose an option to add a picture of your medicine:',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handlePickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleTimeSlotSelect = (slotItem: typeof TIME_SLOTS[0]) => {
    setSelectedTimeSlot(slotItem.slot);
    setCustomTime(slotItem.defaultTime);
  };

  const handleOpenAddModal = () => {
    setName('');
    setDosage('');
    setInstructions('');
    setPillsCount('30');
    setImageUri(null);
    setFrequencyType('everyday');
    setSelectedDays(['Mon', 'Wed', 'Fri']);
    setSelectedTimeSlot('Morning');
    setCustomTime('08:00 AM');
    const now = new Date();
    setSelectedStartDate(now);
    setStartDateFormatted(`Today, ${formatDisplayDate(now)}`);
    setIsOngoing(true);
    setSelectedEndDate(null);
    setEndDateFormatted('Ongoing (No end date)');
    setAlarmEnabled(true);
    setIsAddModalOpen(true);
  };

  const handleDeleteMedication = (med: Medication) => {
    Alert.alert(
      'Delete Medication Routine? 🗑️',
      `Are you sure you want to permanently delete "${med.name} (${med.dosage})"?\n\n• Routine will be deleted\n• Reminders & alarms will be cancelled\n• Supply tracking will be removed`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Routine',
          style: 'destructive',
          onPress: async () => {
            // Stop alarm if this med is currently ringing or snoozed
            if (activeAlarmMed?.id === med.id) {
              stopAudibleAlarm();
              setIsAlarmModalVisible(false);
              setActiveAlarmMed(null);
              setIsSnoozed3m(false);
            }

            // Cancel any scheduled push notification
            if (med.notificationId) {
              await cancelMedicationReminder(med.notificationId);
            }

            // Remove from medications state
            setMeds((prev) => prev.filter((m) => m.id !== med.id));

            Alert.alert(
              'Medication Deleted 🗑️',
              `"${med.name}" has been removed from your routine.`
            );
          },
        },
      ]
    );
  };

  const handleAddMedication = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a medication name.');
      return;
    }

    let frequencyLabel = 'Every day';
    if (frequencyType === 'weekdays') frequencyLabel = 'Mon – Fri';
    else if (frequencyType === 'asneeded') frequencyLabel = 'As needed';
    else if (frequencyType === 'specific') frequencyLabel = selectedDays.join(', ');

    const newMedId = Date.now().toString();
    const finalTime = customTime.trim() || '08:00 AM';
    const finalStartDate = startDateFormatted;
    const finalEndDate = isOngoing ? 'Ongoing' : endDateFormatted;
    const totalPillsParsed = parseInt(pillsCount, 10) || 30;

    let notificationId: string | undefined;
    if (alarmEnabled) {
      const scheduledId = await scheduleMedicationReminder({
        id: newMedId,
        name: name.trim(),
        dosage: dosage.trim() || '1 tablet',
        timeStr: finalTime,
        instructions: instructions.trim() || undefined,
      });
      if (scheduledId) {
        notificationId = scheduledId;
      }
    }

    const newMed: Medication = {
      id: newMedId,
      name: name.trim(),
      dosage: dosage.trim() || '1 tablet',
      instructions: instructions.trim() || 'After food',
      frequency: frequencyLabel,
      selectedDays: frequencyType === 'specific' ? selectedDays : undefined,
      startDate: finalStartDate,
      endDate: finalEndDate,
      time: finalTime,
      timeSlot: selectedTimeSlot,
      nextDose: `Today, ${finalTime}`,
      pillsLeft: totalPillsParsed,
      totalPills: totalPillsParsed,
      imageUri: imageUri ?? undefined,
      status: 'active',
      alarmEnabled,
      notificationId,
    };

    setMeds([newMed, ...meds]);

    // Reset form
    setName('');
    setDosage('');
    setInstructions('');
    setPillsCount('30');
    setImageUri(null);
    setFrequencyType('everyday');
    setIsAddModalOpen(false);

    if (alarmEnabled) {
      Alert.alert(
        'Medication & Alarm Scheduled! 🔔',
        `"${name.trim()} (${dosage.trim() || '1 tablet'})" is scheduled for ${finalTime}.\n\n📅 Duration: ${finalStartDate} → ${finalEndDate}\n🔔 Push notification alarm is set.`
      );
    } else {
      Alert.alert(
        'Medication Saved!',
        `"${name.trim()}" added to your medication routine.`
      );
    }
  };

  const togglePause = (id: string) => {
    setMeds((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: m.status === 'active' ? 'paused' : 'active' } : m
      )
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900" style={styles.container}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2" style={styles.header}>
        <View className="flex-row justify-between items-center mb-3" style={styles.headerRow}>
          <View className="flex-row items-center gap-3">
            <Image
              source={require('@/../assets/images/medirem-logo.png')}
              style={{ width: 40, height: 40, borderRadius: 10 }}
              resizeMode="contain"
            />
            <View>
              <Text className="text-2xl font-black text-slate-900 dark:text-white" style={styles.title}>
                My Medications
              </Text>
              <Text className="text-xs text-slate-400" style={styles.subtitle}>
                {meds.filter((m) => m.status === 'active').length} active routines
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            {isAlarmPlaying && (
              <TouchableOpacity
                onPress={handleOpenAlarmModal}
                style={{
                  backgroundColor: '#FEE2E2',
                  borderWidth: 1,
                  borderColor: '#EF4444',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
                activeOpacity={0.8}>
                <Ionicons name="volume-high" size={14} color="#DC2626" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                  Ringing ({ringSecondsLeft}s)
                </Text>
              </TouchableOpacity>
            )}

            {isSnoozed3m && !isAlarmPlaying && (
              <TouchableOpacity
                onPress={handleOpenAlarmModal}
                style={{
                  backgroundColor: '#FEF3C7',
                  borderWidth: 1,
                  borderColor: '#F59E0B',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
                activeOpacity={0.8}>
                <Ionicons name="time" size={14} color="#B45309" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                  Repeats in {Math.floor(snoozeSecondsLeft / 60)}:{(snoozeSecondsLeft % 60).toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="flex-row items-center gap-1.5 bg-primary px-4 py-2 rounded-full shadow-sm active:opacity-90"
              style={styles.addBtn}
              onPress={handleOpenAddModal}
              activeOpacity={0.85}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text className="text-white text-xs font-bold" style={styles.addBtnText}>Add Med</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 mb-3" style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search medications..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-sm text-slate-900 dark:text-white"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View className="flex-row gap-2" style={styles.filterRow}>
          {(['all', 'active', 'paused'] as const).map((tab) => {
            const isActive = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                className={`px-3 py-1 rounded-full border ${
                  isActive
                    ? 'bg-blue-50 border-primary dark:bg-slate-800'
                    : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                }`}
                style={[
                  styles.filterChip,
                  isActive ? styles.filterChipActive : styles.filterChipInactive,
                ]}
                onPress={() => setFilter(tab)}>
                <Text
                  className={`text-xs font-semibold capitalize ${
                    isActive ? 'text-primary' : 'text-slate-500'
                  }`}
                  style={{ color: isActive ? '#208AEF' : '#64748B' }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Medication List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {filteredMeds.map((med) => {
          const supplyPercent = Math.min(100, Math.round((med.pillsLeft / med.totalPills) * 100));
          const isPaused = med.status === 'paused';
          const doseKey = getDoseKey(med.id, med.time, currentTime);
          const isTakenToday = takenDoseKeys.has(doseKey);
          const isThisDoseStoppedPermanent = permanentlyStoppedKeys.has(doseKey);
          const isDoneToday = isTakenToday || isThisDoseStoppedPermanent;

          // When dose is completed today, getCountdownInfo targets tomorrow with isDue=false!
          const countdown = getCountdownInfo(med.time, currentTime, isPaused, isDoneToday);
          const durationInfo = getRoutineDurationInfo(med.startDate, med.endDate);
          const isThisDoseRinging = isAlarmPlaying && activeAlarmMed?.id === med.id;
          const isThisDoseSnoozed3m = isSnoozed3m && activeAlarmMed?.id === med.id;

          return (
            <View
              key={med.id}
              className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 mb-3.5 shadow-sm"
              style={[styles.medCard, isPaused && styles.medCardPaused]}>
              {/* Header inside card */}
              <View className="flex-row items-center justify-between mb-2.5" style={styles.cardHeader}>
                <View className="flex-row items-center gap-3" style={styles.medIconRow}>
                  {/* Photo Display if uploaded, or Pill Icon fallback */}
                  {med.imageUri ? (
                    <View style={styles.medPhotoWrapper}>
                      <Image source={{ uri: med.imageUri }} style={styles.medPhoto} resizeMode="cover" />
                      <View style={styles.photoTag}>
                        <Ionicons name="camera" size={10} color="#FFFFFF" />
                      </View>
                    </View>
                  ) : (
                    <View className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-700 items-center justify-center border border-blue-100 dark:border-slate-600" style={styles.pillIconCircle}>
                      <MaterialCommunityIcons name="pill" size={24} color="#208AEF" />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text className="text-base font-bold text-slate-900 dark:text-white" style={styles.medName}>
                      {med.name} <Text className="text-sm font-normal text-slate-500" style={styles.medDosage}>{med.dosage}</Text>
                    </Text>
                    <Text className="text-xs text-slate-400" style={styles.medMeta}>
                      {med.frequency} • {med.instructions}
                    </Text>
                  </View>
                </View>

                {/* Top Actions: Status badge and Delete button */}
                <View style={styles.cardTopActions}>
                  {/* Pause / Resume Button */}
                  <TouchableOpacity
                    onPress={() => togglePause(med.id)}
                    className={`px-2.5 py-1 rounded-full ${isPaused ? 'bg-amber-100' : 'bg-slate-100'}`}
                    style={[styles.statusBadge, isPaused ? styles.statusPaused : styles.statusActive]}>
                    <Text
                      className={`text-[10px] font-bold ${isPaused ? 'text-amber-700' : 'text-slate-600'}`}
                      style={{ color: isPaused ? '#B45309' : '#475569' }}>
                      {isPaused ? 'Paused' : 'Active'}
                    </Text>
                  </TouchableOpacity>

                  {/* Delete Routine Button */}
                  <TouchableOpacity
                    onPress={() => handleDeleteMedication(med)}
                    style={styles.cardDeleteIconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.75}
                    accessibilityLabel={`Delete ${med.name}`}>
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Scheduled Days & Time Indicator */}
              <View className="flex-row items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl mb-2" style={styles.nextDoseBar}>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="time-outline" size={14} color="#208AEF" />
                  <Text className="text-xs text-slate-700 dark:text-slate-200" style={styles.nextDoseText}>
                    Time: <Text className="font-bold">{med.time || '08:00 AM'}</Text> ({med.timeSlot})
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="calendar-outline" size={13} color="#64748B" />
                  <Text className="text-xs text-slate-500">{med.frequency}</Text>
                </View>
              </View>

              {/* Start Date & End Date / Alarm Row */}
              <View style={styles.datesAlarmRow}>
                <View style={styles.datesLeftGroup}>
                  <Ionicons name="calendar" size={12} color="#208AEF" />
                  <Text style={styles.datesDurationText}>
                    {med.startDate || 'Started'} → {med.endDate || 'Ongoing'}
                  </Text>
                </View>

                {med.alarmEnabled !== false ? (
                  <TouchableOpacity
                    onPress={() => handleTestCardAlarm(med)}
                    style={styles.cardAlarmPill}
                    activeOpacity={0.75}>
                    <Ionicons name="notifications" size={11} color="#059669" />
                    <Text style={styles.cardAlarmPillText}>Alarm Active</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.cardAlarmMutedPill}>
                    <Ionicons name="notifications-off-outline" size={11} color="#94A3B8" />
                    <Text style={styles.cardAlarmMutedText}>Silent</Text>
                  </View>
                )}
              </View>

              {/* Live Remaining Time & Countdown Banner */}
              {isDoneToday ? (
                /* RED ALERT IS COMPLETELY HIDDEN ONCE DOSE IS TAKEN OR ALARM PERMANENTLY STOPPED! */
                <View style={[styles.countdownBanner, styles.countdownBannerCompleted]}>
                  <View style={styles.countdownLeftRow}>
                    <Ionicons
                      name={isTakenToday ? 'checkmark-circle' : 'notifications-off-circle'}
                      size={16}
                      color="#059669"
                    />
                    <Text style={[styles.countdownLabel, { color: '#059669', fontWeight: '700' }]}>
                      {isTakenToday ? '✓ Dose Taken Today' : '🔕 Alarm Stopped Today'}
                    </Text>
                  </View>
                  <View style={[styles.timerPill, styles.timerPillCompleted]}>
                    <Ionicons name="time-outline" size={12} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={[styles.timerText, styles.timerTextCompleted]}>
                      Next in {countdown.text}
                    </Text>
                  </View>
                </View>
              ) : isThisDoseRinging || isThisDoseSnoozed3m || countdown.isDue ? (
                /* RED DUE / LATE ALERT / RINGING / SNOOZE BANNER */
                <TouchableOpacity
                  onPress={handleOpenAlarmModal}
                  activeOpacity={0.8}
                  style={[
                    styles.countdownBanner,
                    styles.countdownBannerDue,
                  ]}>
                  <View style={styles.countdownLeftRow}>
                    <Ionicons
                      name={
                        isThisDoseRinging
                          ? 'volume-high'
                          : isThisDoseSnoozed3m
                          ? 'time'
                          : 'alert-circle'
                      }
                      size={15}
                      color={isThisDoseSnoozed3m ? '#D97706' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.countdownLabel,
                        isThisDoseSnoozed3m
                          ? styles.countdownLabelUrgent
                          : styles.countdownLabelDue,
                      ]}>
                      {isThisDoseRinging
                        ? `Ringing (${ringSecondsLeft}s left):`
                        : isThisDoseSnoozed3m
                        ? `Snoozed (${Math.floor(snoozeSecondsLeft / 60)}:${(snoozeSecondsLeft % 60).toString().padStart(2, '0')}):`
                        : countdown.label}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.timerPill,
                      isThisDoseSnoozed3m
                        ? styles.timerPillUrgent
                        : styles.timerPillDue,
                    ]}>
                    <Ionicons
                      name={isThisDoseSnoozed3m ? 'time' : 'alert-circle'}
                      size={13}
                      color="#FFFFFF"
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.timerText,
                        isThisDoseSnoozed3m
                          ? styles.timerTextUrgent
                          : styles.timerTextDue,
                      ]}>
                      {isThisDoseRinging
                        ? `Ringing (${ringSecondsLeft}s)`
                        : isThisDoseSnoozed3m
                        ? 'Stop Alarm'
                        : `${countdown.text} late`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                /* NORMAL FUTURE REMAINING TIME COUNTDOWN BANNER OR PAUSED */
                <View
                  style={[
                    styles.countdownBanner,
                    isPaused
                      ? styles.countdownBannerPaused
                      : countdown.isUrgent
                      ? styles.countdownBannerUrgent
                      : styles.countdownBannerNormal,
                  ]}>
                  <View style={styles.countdownLeftRow}>
                    <Ionicons
                      name={
                        isPaused
                          ? 'pause-circle-outline'
                          : countdown.isUrgent
                          ? 'alarm-outline'
                          : 'timer-outline'
                      }
                      size={15}
                      color={
                        isPaused
                          ? '#94A3B8'
                          : countdown.isUrgent
                          ? '#D97706'
                          : '#208AEF'
                      }
                    />
                    <Text
                      style={[
                        styles.countdownLabel,
                        isPaused
                          ? styles.countdownLabelPaused
                          : countdown.isUrgent
                          ? styles.countdownLabelUrgent
                          : styles.countdownLabelNormal,
                      ]}>
                      {countdown.label}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.timerPill,
                      isPaused
                        ? styles.timerPillPaused
                        : countdown.isUrgent
                        ? styles.timerPillUrgent
                        : styles.timerPillNormal,
                    ]}>
                    <Text
                      style={[
                        styles.timerText,
                        isPaused
                          ? styles.timerTextPaused
                          : countdown.isUrgent
                          ? styles.timerTextUrgent
                          : styles.timerTextNormal,
                      ]}>
                      {countdown.text}
                    </Text>
                  </View>
                </View>
              )}

              {/* Supply Progress & Pill Counter */}
              <View className="mt-1" style={styles.supplyContainer}>
                {/* Header Row */}
                <View className="flex-row justify-between items-center mb-1.5" style={styles.supplyHeaderRow}>
                  <View className="flex-row items-center gap-1.5">
                    <MaterialCommunityIcons name="pill" size={14} color="#208AEF" />
                    <Text className="text-xs text-slate-500 dark:text-slate-400 font-semibold" style={styles.supplyLabel}>
                      Remaining Pills
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs text-slate-700 dark:text-slate-200" style={styles.supplyCount}>
                      <Text style={styles.supplyCountBold}>{med.pillsLeft}</Text>
                      <Text style={styles.supplyCountTotal}> / {med.totalPills} pills</Text>
                    </Text>
                    <View
                      style={[
                        styles.supplyPercentPill,
                        {
                          backgroundColor:
                            supplyPercent <= 20
                              ? '#FEE2E2'
                              : supplyPercent <= 40
                              ? '#FEF3C7'
                              : '#E6F4FE',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.supplyPercentPillText,
                          {
                            color:
                              supplyPercent <= 20
                                ? '#DC2626'
                                : supplyPercent <= 40
                                ? '#D97706'
                                : '#208AEF',
                          },
                        ]}>
                        {supplyPercent}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2" style={styles.progressBar}>
                  <View
                    className="h-full rounded-full"
                    style={[
                      styles.progressFill,
                      {
                        width: `${supplyPercent}%`,
                        backgroundColor:
                          supplyPercent <= 20
                            ? '#EF4444'
                            : supplyPercent <= 40
                            ? '#F59E0B'
                            : '#208AEF',
                      },
                    ]}
                  />
                </View>

                {/* Supply Insight & Remaining Duration Breakdown */}
                <View style={styles.supplyInsightRow}>
                  <Text style={styles.supplyInsightText}>
                    {med.pillsLeft === 0
                      ? '⚠️ Out of pills - Refill required'
                      : med.pillsLeft === 1
                      ? '1 dose supply remaining'
                      : `~${med.pillsLeft} doses supply remaining`}
                  </Text>

                  {durationInfo.daysRemaining !== null && (
                    <View style={styles.durationInsightBadge}>
                      <Ionicons name="calendar-outline" size={10} color="#64748B" />
                      <Text style={styles.durationInsightText}>
                        {durationInfo.summaryText}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Direct Action Controls: Take Dose, Quick Stepper, Refill, and Sync */}
                <View style={styles.supplyActionRow}>
                  {/* Take Dose Quick Button */}
                  <TouchableOpacity
                    onPress={() => handleTakePillDose(med.id)}
                    disabled={med.pillsLeft <= 0}
                    style={[
                      styles.takePillBtn,
                      med.pillsLeft <= 0 && styles.takePillBtnDisabled,
                    ]}
                    activeOpacity={0.8}>
                    <Ionicons name="checkmark-circle-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.takePillBtnText}>Take Dose (-1)</Text>
                  </TouchableOpacity>

                  {/* Stepper (- / +) */}
                  <View style={styles.pillStepperBox}>
                    <TouchableOpacity
                      onPress={() => handleAdjustPillCount(med.id, -1)}
                      disabled={med.pillsLeft <= 0}
                      style={styles.stepperSubBtn}
                      activeOpacity={0.7}>
                      <Ionicons name="remove" size={12} color="#475569" />
                    </TouchableOpacity>

                    <Text style={styles.stepperNumber}>{med.pillsLeft}</Text>

                    <TouchableOpacity
                      onPress={() => handleAdjustPillCount(med.id, 1)}
                      style={styles.stepperSubBtn}
                      activeOpacity={0.7}>
                      <Ionicons name="add" size={12} color="#475569" />
                    </TouchableOpacity>
                  </View>

                  {/* Refill Button */}
                  <TouchableOpacity
                    onPress={() => handleRefillMed(med.id)}
                    style={styles.pillRefillSmallBtn}
                    activeOpacity={0.75}>
                    <Ionicons name="refresh" size={11} color="#208AEF" />
                    <Text style={styles.pillRefillSmallBtnText}>Refill</Text>
                  </TouchableOpacity>

                  {/* Quick Sync Button if pills don't match routine days */}
                  {durationInfo.daysRemaining !== null &&
                    durationInfo.daysRemaining > 0 &&
                    med.pillsLeft !== durationInfo.daysRemaining && (
                      <TouchableOpacity
                        onPress={() => handleSyncToRoutine(med.id, durationInfo.daysRemaining!)}
                        style={styles.syncRoutineBtn}
                        activeOpacity={0.75}>
                        <Ionicons name="sync-outline" size={11} color="#059669" />
                        <Text style={styles.syncRoutineBtnText}>
                          Sync to {durationInfo.daysRemaining}
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
              </View>

              {/* Refill Alert Badge: only when supply is genuinely low (<= 5 pills) */}
              {med.pillsLeft <= 5 && (
                <View className="flex-row items-center gap-2 mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 rounded-xl" style={styles.refillBadge}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400" style={styles.refillText}>
                    {med.pillsLeft === 0
                      ? '⚠️ Out of pills — Refill required immediately!'
                      : `Refill Alert: Only ${med.pillsLeft} ${med.pillsLeft === 1 ? 'pill' : 'pills'} left in supply!`}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Comprehensive Add Medication Modal Sheet */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50" style={styles.modalOverlay}>
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl pt-5 pb-8 px-6 max-h-[90%]" style={styles.modalContent}>
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center">
                  <MaterialCommunityIcons name="pill" size={18} color="#208AEF" />
                </View>
                <Text className="text-xl font-black text-slate-900 dark:text-white" style={styles.modalTitle}>
                  Add Medication
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Photo Box (Matching Screen 8 in mockups) */}
              <View className="items-center my-3" style={styles.photoSection}>
                {imageUri ? (
                  <View style={styles.previewBox}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={showImagePickerOptions}
                      className="absolute bottom-2 bg-primary px-3 py-1.5 rounded-full flex-row items-center gap-1.5 shadow-md"
                      style={styles.changePhotoBtn}
                      activeOpacity={0.85}>
                      <Ionicons name="camera" size={14} color="#FFFFFF" />
                      <Text className="text-white text-xs font-bold">Change Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setImageUri(null)}
                      className="absolute top-2 right-2 bg-black/60 w-7 h-7 rounded-full items-center justify-center"
                      style={styles.deletePhotoBtn}>
                      <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={showImagePickerOptions}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-sky-300 dark:border-slate-700 bg-blue-50/60 dark:bg-slate-800/50 items-center justify-center"
                    style={styles.emptyPhotoBox}
                    activeOpacity={0.75}>
                    <View className="w-12 h-12 rounded-full bg-blue-100 dark:bg-slate-700 items-center justify-center mb-2">
                      <Ionicons name="camera" size={24} color="#208AEF" />
                    </View>
                    <Text className="text-sm font-bold text-slate-800 dark:text-white">Add Medicine Photo</Text>
                    <Text className="text-xs text-slate-400 mt-0.5">Take photo or choose from gallery</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Medication Name */}
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Medication Name *
              </Text>
              <TextInput
                placeholder="e.g. Metformin, Paracetamol"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white mb-3"
                style={styles.modalInput}
              />

              {/* Dosage */}
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Dosage
              </Text>
              <TextInput
                placeholder="e.g. 500mg, 1 tablet, 5ml"
                placeholderTextColor="#94A3B8"
                value={dosage}
                onChangeText={setDosage}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white mb-3"
                style={styles.modalInput}
              />

              {/* Instructions */}
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Instructions (Optional)
              </Text>
              <TextInput
                placeholder="e.g. After food, With water, Before sleep"
                placeholderTextColor="#94A3B8"
                value={instructions}
                onChangeText={setInstructions}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white mb-4"
                style={styles.modalInput}
              />

              {/* Routine: Days / Frequency */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Routine: Scheduled Days
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-2.5">
                  {[
                    { key: 'everyday', label: 'Every day' },
                    { key: 'weekdays', label: 'Weekdays' },
                    { key: 'specific', label: 'Specific Days' },
                    { key: 'asneeded', label: 'As needed' },
                  ].map((freq) => {
                    const isSelected = frequencyType === freq.key;
                    return (
                      <TouchableOpacity
                        key={freq.key}
                        onPress={() => setFrequencyType(freq.key as any)}
                        className={`px-3.5 py-2 rounded-xl border ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                        style={[
                          styles.freqBtn,
                          isSelected && { backgroundColor: '#208AEF', borderColor: '#208AEF' },
                        ]}>
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                          }`}
                          style={{ color: isSelected ? '#FFFFFF' : '#475569' }}>
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Day of Week Selector if 'specific' */}
                {frequencyType === 'specific' && (
                  <View className="flex-row justify-between mt-1 mb-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                    {DAYS_OF_WEEK.map((d) => {
                      const isDaySelected = selectedDays.includes(d.key);
                      return (
                        <TouchableOpacity
                          key={d.key}
                          onPress={() => toggleDay(d.key)}
                          className={`w-9 h-9 rounded-full items-center justify-center ${
                            isDaySelected ? 'bg-primary' : 'bg-white dark:bg-slate-700 border border-slate-200'
                          }`}
                          style={[
                            styles.dayCircle,
                            isDaySelected && { backgroundColor: '#208AEF' },
                          ]}>
                          <Text
                            className={`text-xs font-bold ${
                              isDaySelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                            }`}
                            style={{ color: isDaySelected ? '#FFFFFF' : '#475569' }}>
                            {d.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Routine: Reminder Time with Interactive Time Picker */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Routine: Reminder Time
                </Text>

                {/* 4 Quick Preset Time Slot Buttons (Morning, Afternoon, Evening, Night) */}
                <View className="flex-row gap-2 mb-2.5">
                  {TIME_SLOTS.map((t) => {
                    const isSlotSelected = selectedTimeSlot === t.slot;
                    return (
                      <TouchableOpacity
                        key={t.slot}
                        onPress={() => handleTimeSlotSelect(t)}
                        className={`flex-1 p-2 rounded-xl border items-center ${
                          isSlotSelected
                            ? 'bg-blue-50 border-primary dark:bg-sky-950/60'
                            : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                        style={[
                          styles.timeSlotCard,
                          isSlotSelected && { borderColor: '#208AEF', backgroundColor: '#E6F4FE' },
                        ]}>
                        <Ionicons name={t.icon} size={18} color={t.color} />
                        <Text className="text-[11px] font-bold text-slate-800 dark:text-white mt-1">
                          {t.slot}
                        </Text>
                        <Text className="text-[9px] text-slate-400">{t.defaultTime}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Time Selector Card (Surrounded by red box in mockup) */}
                <TouchableOpacity
                  onPress={() => setIsTimePickerOpen(true)}
                  className="flex-row items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl"
                  style={styles.pickerTriggerCard}
                  activeOpacity={0.8}>
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-sky-950 items-center justify-center" style={styles.pickerIconBox}>
                      <Ionicons name="time" size={20} color="#208AEF" />
                    </View>
                    <View>
                      <Text style={styles.pickerCardSub}>SCHEDULED TIME ({selectedTimeSlot})</Text>
                      <Text style={styles.pickerCardValue}>{customTime}</Text>
                    </View>
                  </View>
                  <View style={styles.pickerActionChip}>
                    <Ionicons name="alarm-outline" size={13} color="#208AEF" />
                    <Text style={styles.pickerActionText}>Custom Time</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Schedule Duration: Start & End Dates Section */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Schedule Duration (Start & End Dates)
                </Text>

                {/* Start Date Selector */}
                <TouchableOpacity
                  onPress={() => setIsStartDatePickerOpen(true)}
                  style={styles.pickerTriggerCard}
                  activeOpacity={0.8}>
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-sky-950 items-center justify-center" style={styles.pickerIconBox}>
                      <Ionicons name="calendar" size={19} color="#208AEF" />
                    </View>
                    <View>
                      <Text style={styles.pickerCardSub}>START DATE</Text>
                      <Text style={styles.pickerCardValue}>{startDateFormatted}</Text>
                    </View>
                  </View>
                  <View style={styles.pickerActionChip}>
                    <Ionicons name="calendar-outline" size={12} color="#208AEF" />
                    <Text style={styles.pickerActionText}>Select Date</Text>
                  </View>
                </TouchableOpacity>

                {/* End Date Selector */}
                <TouchableOpacity
                  onPress={() => setIsEndDatePickerOpen(true)}
                  style={[styles.pickerTriggerCard, { marginTop: 8 }]}
                  activeOpacity={0.8}>
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={[styles.pickerIconBox, { backgroundColor: isOngoing ? '#F1F5F9' : '#FEF3C7' }]}>
                      <Ionicons
                        name={isOngoing ? 'infinite' : 'flag'}
                        size={19}
                        color={isOngoing ? '#64748B' : '#D97706'}
                      />
                    </View>
                    <View>
                      <Text style={styles.pickerCardSub}>END DATE</Text>
                      <Text style={styles.pickerCardValue}>{endDateFormatted}</Text>
                    </View>
                  </View>
                  <View style={[styles.pickerActionChip, isOngoing && { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                    <Ionicons
                      name={isOngoing ? 'infinite-outline' : 'calendar-outline'}
                      size={12}
                      color={isOngoing ? '#64748B' : '#208AEF'}
                    />
                    <Text style={[styles.pickerActionText, isOngoing && { color: '#64748B' }]}>
                      {isOngoing ? 'Choose Date' : 'Change Date'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Quick Presets for End Date */}
                <View style={styles.durationPresetRow}>
                  <TouchableOpacity
                    onPress={() => handleSelectEndDatePreset('ongoing')}
                    style={[styles.presetChip, isOngoing && styles.presetChipActive]}>
                    <Text style={[styles.presetChipText, isOngoing && styles.presetChipTextActive]}>
                      Ongoing
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSelectEndDatePreset(7)}
                    style={[
                      styles.presetChip,
                      !isOngoing && selectedEndDate && Math.round((selectedEndDate.getTime() - selectedStartDate.getTime()) / 86400000) === 7 && styles.presetChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.presetChipText,
                        !isOngoing && selectedEndDate && Math.round((selectedEndDate.getTime() - selectedStartDate.getTime()) / 86400000) === 7 && styles.presetChipTextActive,
                      ]}>
                      7 Days
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSelectEndDatePreset(14)}
                    style={[
                      styles.presetChip,
                      !isOngoing && selectedEndDate && Math.round((selectedEndDate.getTime() - selectedStartDate.getTime()) / 86400000) === 14 && styles.presetChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.presetChipText,
                        !isOngoing && selectedEndDate && Math.round((selectedEndDate.getTime() - selectedStartDate.getTime()) / 86400000) === 14 && styles.presetChipTextActive,
                      ]}>
                      14 Days
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSelectEndDatePreset(30)}
                    style={[
                      styles.presetChip,
                      !isOngoing && selectedEndDate && Math.round((selectedEndDate.getTime() - selectedStartDate.getTime()) / 86400000) === 30 && styles.presetChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.presetChipText,
                        !isOngoing && selectedEndDate && Math.round((selectedEndDate.getTime() - selectedStartDate.getTime()) / 86400000) === 30 && styles.presetChipTextActive,
                      ]}>
                      30 Days
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsEndDatePickerOpen(true)}
                    style={styles.presetChip}>
                    <Ionicons name="calendar-outline" size={11} color="#208AEF" />
                    <Text style={[styles.presetChipText, { color: '#208AEF' }]}>Custom</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Push Notification & Alarm Section */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Push Notification & Alarm
                </Text>
                <View style={styles.alarmControlCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={[styles.pickerIconBox, { backgroundColor: alarmEnabled ? '#DCFCE7' : '#F1F5F9' }]}>
                        <Ionicons
                          name={alarmEnabled ? 'notifications' : 'notifications-off-outline'}
                          size={19}
                          color={alarmEnabled ? '#059669' : '#94A3B8'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alarmTitle}>
                          {alarmEnabled ? 'Medication Alarm Armed' : 'Alarm Disabled'}
                        </Text>
                        <Text style={styles.alarmSubtitle}>
                          {alarmEnabled
                            ? `Will alert with sound & vibration at ${customTime}`
                            : 'No alarm or sound will trigger'}
                        </Text>
                      </View>
                    </View>

                    {/* Toggle Switch */}
                    <TouchableOpacity
                      onPress={() => setAlarmEnabled((prev) => !prev)}
                      style={[styles.alarmToggle, alarmEnabled ? styles.alarmToggleOn : styles.alarmToggleOff]}
                      activeOpacity={0.8}>
                      <View style={[styles.alarmToggleThumb, alarmEnabled && styles.alarmToggleThumbOn]} />
                    </TouchableOpacity>
                  </View>

                  {/* Immediate Test Button */}
                  <TouchableOpacity
                    onPress={handleTestAlarm}
                    style={styles.testAlarmBtn}
                    activeOpacity={0.75}>
                    <Ionicons name="volume-high-outline" size={15} color="#208AEF" />
                    <Text style={styles.testAlarmBtnText}>Test Alarm & Notification Now</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Starting Supply Count */}
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Supply: Total Pill Quantity
                  </Text>
                  {!isOngoing && selectedEndDate && (
                    <Text className="text-[11px] font-semibold text-primary" style={{ color: '#208AEF' }}>
                      Auto-synced with routine days
                    </Text>
                  )}
                </View>

                <TextInput
                  placeholder="e.g. 7, 14, 30"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={pillsCount}
                  onChangeText={setPillsCount}
                  selectTextOnFocus={true}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white mb-2"
                  style={styles.modalInput}
                />

                {/* Quick Pill Presets Chips */}
                <View style={styles.pillPresetRow}>
                  {[7, 14, 30, 60, 90].map((num) => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setPillsCount(num.toString())}
                      style={[
                        styles.pillPresetChip,
                        pillsCount === num.toString() && styles.pillPresetChipActive,
                      ]}>
                      <Text
                        style={[
                          styles.pillPresetChipText,
                          pillsCount === num.toString() && styles.pillPresetChipTextActive,
                        ]}>
                        {num} Pills
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleAddMedication}
                className="w-full h-14 rounded-full bg-primary flex-row items-center justify-center shadow-md active:opacity-90"
                style={styles.saveBtn}
                activeOpacity={0.85}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold text-base" style={styles.saveBtnText}>
                  Save Medication Routine
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Interactive Calendar Date Picker Modal for Start Date */}
      <CalendarPickerModal
        visible={isStartDatePickerOpen}
        initialDate={selectedStartDate}
        title="Select Start Date"
        onClose={() => setIsStartDatePickerOpen(false)}
        onSelectDate={(date, formatted) => {
          setSelectedStartDate(date);
          setStartDateFormatted(formatted);
          if (!isOngoing && selectedEndDate && selectedEndDate < date) {
            const nextEnd = new Date(date.getTime());
            nextEnd.setDate(nextEnd.getDate() + 7);
            setSelectedEndDate(nextEnd);
            setEndDateFormatted(formatDisplayDate(nextEnd));
          }
        }}
      />

      {/* Interactive Calendar Date Picker Modal for End Date */}
      <CalendarPickerModal
        visible={isEndDatePickerOpen}
        initialDate={selectedEndDate || new Date(selectedStartDate.getTime() + 7 * 86400000)}
        title="Select End Date"
        onClose={() => setIsEndDatePickerOpen(false)}
        onSelectDate={(date, formatted) => {
          setSelectedEndDate(date);
          setEndDateFormatted(formatted);
          setIsOngoing(false);
          const diffDays = Math.max(1, Math.round((date.getTime() - selectedStartDate.getTime()) / 86400000));
          setPillsCount(diffDays.toString());
        }}
      />

      {/* Interactive Time Picker Modal */}
      <TimePickerModal
        visible={isTimePickerOpen}
        initialTime={customTime}
        onClose={() => setIsTimePickerOpen(false)}
        onSelectTime={(formattedTime, timeSlot) => {
          setCustomTime(formattedTime);
          setSelectedTimeSlot(timeSlot);
        }}
      />

      {/* Active Medication Alarm Modal: 1-minute ringing & 3-minute repeat cycle */}
      <Modal
        visible={isAlarmModalVisible && activeAlarmMed !== null}
        animationType="fade"
        transparent
        onRequestClose={handleStopAlarmPermanent}>
        <View style={styles.alarmModalOverlay}>
          <View style={styles.alarmModalCard}>
            {/* Alarm Header */}
            <View style={styles.alarmHeader}>
              <View
                style={[
                  styles.alarmBellCircle,
                  isSnoozed3m && { backgroundColor: '#F59E0B', shadowColor: '#F59E0B' },
                ]}>
                <Ionicons
                  name={isSnoozed3m ? 'time' : 'notifications'}
                  size={32}
                  color="#FFFFFF"
                />
              </View>

              <Text style={[styles.alarmHeaderTitle, isSnoozed3m && { color: '#B45309' }]}>
                {isSnoozed3m ? 'ALARM SNOOZED (3 MIN)' : 'MEDICATION ALARM (1 MIN)'}
              </Text>

              <Text style={styles.alarmHeaderSubtitle}>
                {isSnoozed3m
                  ? `⏰ Repeating in ${Math.floor(snoozeSecondsLeft / 60)}:${(snoozeSecondsLeft % 60)
                      .toString()
                      .padStart(2, '0')}. Will ring continuously for 1 minute.`
                  : `🔔 Continuous alarm ringing: ${ringSecondsLeft}s remaining. Will repeat in 3 mins unless stopped permanently.`}
              </Text>

              {/* Ringing / Snooze Countdown Bar */}
              <View style={styles.alarmCountdownBarWrap}>
                <View
                  style={[
                    styles.alarmCountdownBarFill,
                    {
                      width: isSnoozed3m
                        ? `${Math.max(0, (snoozeSecondsLeft / 180) * 100)}%`
                        : `${Math.max(0, (ringSecondsLeft / 60) * 100)}%`,
                      backgroundColor: isSnoozed3m ? '#F59E0B' : '#EF4444',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Medicine Card Inside Alert */}
            {activeAlarmMed && (
              <View style={styles.alarmMedDetails}>
                <View style={styles.alarmMedRow}>
                  {activeAlarmMed.imageUri ? (
                    <Image
                      source={{ uri: activeAlarmMed.imageUri }}
                      style={styles.alarmMedPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.alarmMedIconBox}>
                      <MaterialCommunityIcons name="pill" size={32} color="#208AEF" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.alarmMedName}>{activeAlarmMed.name}</Text>
                    <Text style={styles.alarmMedDosage}>{activeAlarmMed.dosage}</Text>
                    <Text style={styles.alarmMedMeta}>
                      {activeAlarmMed.time} • {activeAlarmMed.timeSlot}
                    </Text>
                    <Text style={styles.alarmMedInstructions}>
                      {activeAlarmMed.instructions || 'Take as prescribed'}
                    </Text>
                  </View>
                </View>

                {/* Pill Counter badge */}
                <View style={styles.alarmPillBadge}>
                  <Ionicons name="medical" size={13} color="#208AEF" />
                  <Text style={styles.alarmPillBadgeText}>
                    Remaining Pills: {activeAlarmMed.pillsLeft} / {activeAlarmMed.totalPills}
                  </Text>
                </View>
              </View>
            )}

            {/* 3 Explicit Buttons: Take Dose Permanent, Stop Alarm Permanent, and Snooze 3m */}
            <View style={styles.alarmActions}>
              {/* Button 1: Take Dose & Stop Permanently */}
              <TouchableOpacity
                onPress={() => activeAlarmMed && handleTakeAlarmDosePermanent(activeAlarmMed)}
                style={styles.takeDoseBtn}
                activeOpacity={0.85}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.takeDoseBtnText}>Take Dose & Stop Permanently</Text>
                  <Text style={styles.takeDoseBtnSub}>Marks dose taken • Never alarms again after 3 mins</Text>
                </View>
              </TouchableOpacity>

              {/* Button 2: Stop Alarm Permanently (Do not alarm after 3 mins) */}
              <TouchableOpacity
                onPress={handleStopAlarmPermanent}
                style={styles.stopPermanentBtn}
                activeOpacity={0.85}>
                <Ionicons name="close-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopPermanentBtnText}>Stop Alarm Permanently</Text>
                  <Text style={styles.stopPermanentBtnSub}>Silences alarm completely • Will NEVER repeat</Text>
                </View>
              </TouchableOpacity>

              {/* Button 3: Snooze for 3 Minutes (or Ring Now if already in 3m snooze) */}
              <TouchableOpacity
                onPress={isSnoozed3m ? () => activeAlarmMed && handleTriggerMedAlarm(activeAlarmMed) : handleSnooze3Minutes}
                style={styles.snooze3mBtn}
                activeOpacity={0.8}>
                <Ionicons name={isSnoozed3m ? 'play-circle' : 'time'} size={17} color="#B45309" style={{ marginRight: 6 }} />
                <Text style={styles.snooze3mBtnText}>
                  {isSnoozed3m ? 'Ring Alarm Now' : 'Snooze (Alarm Again in 3 Mins)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#208AEF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    elevation: 2,
    shadowColor: '#208AEF',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#E6F4FE',
    borderColor: '#208AEF',
  },
  filterChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  medCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  medCardPaused: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  medPhotoWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#208AEF',
  },
  medPhoto: {
    width: '100%',
    height: '100%',
  },
  photoTag: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#208AEF',
    borderRadius: 6,
    padding: 2,
  },
  pillIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  medDosage: {
    fontSize: 13,
    fontWeight: '400',
    color: '#64748B',
  },
  medMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#F1F5F9',
  },
  statusPaused: {
    backgroundColor: '#FEF3C7',
  },
  cardTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDeleteIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextDoseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  nextDoseText: {
    fontSize: 12,
    color: '#334155',
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  countdownBannerNormal: {
    backgroundColor: '#F0F7FF',
    borderColor: '#BAE6FD',
  },
  countdownBannerUrgent: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  countdownBannerDue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  countdownBannerPaused: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  countdownBannerCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  countdownLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  countdownLabelNormal: {
    color: '#0369A1',
  },
  countdownLabelUrgent: {
    color: '#B45309',
  },
  countdownLabelDue: {
    color: '#B91C1C',
  },
  countdownLabelPaused: {
    color: '#64748B',
  },
  timerPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  timerPillNormal: {
    backgroundColor: '#208AEF',
  },
  timerPillUrgent: {
    backgroundColor: '#F59E0B',
  },
  timerPillDue: {
    backgroundColor: '#EF4444',
  },
  timerPillPaused: {
    backgroundColor: '#94A3B8',
  },
  timerPillCompleted: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timerTextNormal: {
    color: '#FFFFFF',
  },
  timerTextUrgent: {
    color: '#FFFFFF',
  },
  timerTextDue: {
    color: '#FFFFFF',
  },
  timerTextPaused: {
    color: '#FFFFFF',
  },
  timerTextCompleted: {
    color: '#15803D',
  },
  supplyContainer: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  supplyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  supplyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  supplyCount: {
    fontSize: 12,
    color: '#334155',
  },
  supplyCountBold: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  supplyCountTotal: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  supplyPercentPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  supplyPercentPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  progressBar: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  supplyInsightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  supplyInsightText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  durationInsightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  durationInsightText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  supplyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  takePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#208AEF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  takePillBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.5,
  },
  takePillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pillStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  stepperSubBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNumber: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 4,
  },
  pillRefillSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pillRefillSmallBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#208AEF',
  },
  syncRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  syncRoutineBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  pillPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  pillPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillPresetChipActive: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  pillPresetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pillPresetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  refillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
  },
  refillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
  },
  closeBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  photoSection: {
    marginVertical: 12,
    alignItems: 'center',
  },
  previewBox: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#208AEF',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changePhotoBtn: {
    backgroundColor: '#208AEF',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotoBox: {
    width: '100%',
    height: 140,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  pickerTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotCard: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#208AEF',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  datesAlarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  datesLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datesDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  cardAlarmPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardAlarmPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  cardAlarmMutedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardAlarmMutedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pickerCardSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  pickerCardValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  pickerActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pickerActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#208AEF',
  },
  durationPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  alarmControlCard: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  alarmTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  alarmSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  alarmToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  alarmToggleOn: {
    backgroundColor: '#10B981',
  },
  alarmToggleOff: {
    backgroundColor: '#CBD5E1',
  },
  alarmToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  alarmToggleThumbOn: {
    alignSelf: 'flex-end',
  },
  testAlarmBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  testAlarmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#208AEF',
  },
  alarmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alarmModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
  },
  alarmHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  alarmBellCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  alarmHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  alarmHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
  },
  alarmMedDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  alarmMedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alarmMedPhoto: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  alarmMedIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  alarmMedName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  alarmMedDosage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#208AEF',
    marginTop: 1,
  },
  alarmMedMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  alarmMedInstructions: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 2,
  },
  alarmPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  alarmPillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  alarmCountdownBarWrap: {
    width: '100%',
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10,
  },
  alarmCountdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  alarmActions: {
    width: '100%',
    gap: 10,
  },
  takeDoseBtn: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#10B981',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  takeDoseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  takeDoseBtnSub: {
    color: '#D1FAE5',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  stopPermanentBtn: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stopPermanentBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  stopPermanentBtnSub: {
    color: '#FEE2E2',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  snooze3mBtn: {
    width: '100%',
    height: 44,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snooze3mBtnText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '700',
  },
});
