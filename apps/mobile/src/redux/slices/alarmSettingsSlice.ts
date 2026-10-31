import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RingtoneItem {
  id: string;
  name: string;
  description: string;
  soundUrl: string;
  category: 'chime' | 'beeper' | 'bell' | 'radar' | 'zen' | 'custom';
  icon: string;
  color: string;
  vibrationPattern: 'urgent' | 'standard' | 'gentle' | 'heartbeat';
  isCustom?: boolean;
}

export interface AlarmSettingsState {
  activeRingtoneId: string;
  ringtones: RingtoneItem[];
  volume: number;
  vibrationEnabled: boolean;
}

export const DEFAULT_RINGTONES: RingtoneItem[] = [
  {
    id: 'digital-pager',
    name: 'Digital Medical Beeper',
    description: 'High-contrast clinical double beep',
    soundUrl: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    category: 'beeper',
    icon: 'notifications',
    color: '#208AEF',
    vibrationPattern: 'urgent',
    isCustom: false,
  },
  {
    id: 'gentle-chime',
    name: 'Gentle Morning Chime',
    description: 'Peaceful harmonic bells for soft awakening',
    soundUrl: 'https://actions.google.com/sounds/v1/household/doorbell_chime.ogg',
    category: 'chime',
    icon: 'sunny',
    color: '#10B981',
    vibrationPattern: 'gentle',
    isCustom: false,
  },
  {
    id: 'radiant-bell',
    name: 'Radiant Cathedral Bell',
    description: 'Deep resonant reverberating chime',
    soundUrl: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg',
    category: 'bell',
    icon: 'notifications-circle',
    color: '#8B5CF6',
    vibrationPattern: 'standard',
    isCustom: false,
  },
  {
    id: 'urgent-radar',
    name: 'Urgent Radar Pulse',
    description: 'Rapid pulsed siren for critical medications',
    soundUrl: 'https://actions.google.com/sounds/v1/emergency/siren_short.ogg',
    category: 'radar',
    icon: 'warning',
    color: '#EF4444',
    vibrationPattern: 'urgent',
    isCustom: false,
  },
  {
    id: 'zen-harmony',
    name: 'Zen Singing Bowl',
    description: 'Calm singing bowl for soothing reminders',
    soundUrl: 'https://actions.google.com/sounds/v1/household/clock_ticking.ogg',
    category: 'zen',
    icon: 'flower',
    color: '#F59E0B',
    vibrationPattern: 'heartbeat',
    isCustom: false,
  },
];

const initialState: AlarmSettingsState = {
  activeRingtoneId: 'digital-pager',
  ringtones: DEFAULT_RINGTONES,
  volume: 1.0,
  vibrationEnabled: true,
};

export const alarmSettingsSlice = createSlice({
  name: 'alarmSettings',
  initialState,
  reducers: {
    // 1. UPDATE: Select active ringtone
    setActiveRingtone: (state, action: PayloadAction<string>) => {
      state.activeRingtoneId = action.payload;
    },
    // 2. CREATE: Add custom ringtone
    addCustomRingtone: (state, action: PayloadAction<RingtoneItem>) => {
      state.ringtones.push(action.payload);
      state.activeRingtoneId = action.payload.id;
    },
    // 3. UPDATE: Edit custom ringtone
    updateCustomRingtone: (
      state,
      action: PayloadAction<{ id: string; data: Partial<RingtoneItem> }>
    ) => {
      const idx = state.ringtones.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) {
        state.ringtones[idx] = { ...state.ringtones[idx], ...action.payload.data };
      }
    },
    // 4. DELETE: Remove custom ringtone
    deleteCustomRingtone: (state, action: PayloadAction<string>) => {
      state.ringtones = state.ringtones.filter((r) => r.id !== action.payload);
      if (state.activeRingtoneId === action.payload) {
        state.activeRingtoneId = 'digital-pager';
      }
    },
    // Volume & Vibration
    setAlarmVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload;
    },
    setVibrationEnabled: (state, action: PayloadAction<boolean>) => {
      state.vibrationEnabled = action.payload;
    },
  },
});

export const {
  setActiveRingtone,
  addCustomRingtone,
  updateCustomRingtone,
  deleteCustomRingtone,
  setAlarmVolume,
  setVibrationEnabled,
} = alarmSettingsSlice.actions;

export default alarmSettingsSlice.reducer;
