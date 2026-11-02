import AsyncStorage from '@react-native-async-storage/async-storage';

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';
export type ThemeMode = 'light' | 'evening' | 'dark';
export type ThemePreference = 'auto' | 'light' | 'evening' | 'dark';

export const THEME_PREF_KEY = '@medirem_theme_preference';

export interface TimeGreetingThemeDetails {
  period: TimePeriod;
  greetingText: string;
  emoji: string;
  iconName: 'sunny' | 'partly-sunny' | 'cloudy-night' | 'moon';
  iconColor: string;
  themeMode: ThemeMode;
  isDark: boolean;
  isEvening: boolean;
  colors: {
    background: string;
    surfaceBg: string;
    card: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    headerBg: string;
    progressTrack: string;
  };
}

/**
 * Determine dynamic greeting & colors based on current time of day or manual override
 */
export function getTimeGreetingThemeDetails(
  date = new Date(),
  manualOverride: ThemePreference = 'auto'
): TimeGreetingThemeDetails {
  const h = date.getHours();

  let period: TimePeriod = 'morning';
  let greetingText = 'Good Morning';
  let emoji = '☀️';
  let iconName: 'sunny' | 'partly-sunny' | 'cloudy-night' | 'moon' = 'sunny';
  let iconColor = '#F59E0B';
  let naturalTheme: ThemeMode = 'light';

  // 1. Morning: 05:00 - 11:59
  if (h >= 5 && h < 12) {
    period = 'morning';
    greetingText = 'Good Morning';
    emoji = '☀️';
    iconName = 'sunny';
    iconColor = '#F59E0B'; // Golden Sun
    naturalTheme = 'light';
  }
  // 2. Afternoon / Noon: 12:00 - 16:59
  else if (h >= 12 && h < 17) {
    period = 'afternoon';
    greetingText = 'Good Afternoon';
    emoji = '🌤️';
    iconName = 'partly-sunny';
    iconColor = '#0284C7'; // Blue Sky Sun
    naturalTheme = 'light';
  }
  // 3. Evening: 17:00 - 20:59 (Twilight - little dark)
  else if (h >= 17 && h < 21) {
    period = 'evening';
    greetingText = 'Good Evening';
    emoji = '🌇';
    iconName = 'cloudy-night';
    iconColor = '#F97316'; // Sunset Amber / Orange
    naturalTheme = 'evening';
  }
  // 4. Night: 21:00 - 04:59 (Full Dark)
  else {
    period = 'night';
    greetingText = 'Good Night';
    emoji = '🌙';
    iconName = 'moon';
    iconColor = '#818CF8'; // Moon Glow Indigo
    naturalTheme = 'dark';
  }

  const activeTheme: ThemeMode =
    manualOverride && manualOverride !== 'auto' ? manualOverride : naturalTheme;

  const isDark = activeTheme === 'dark';
  const isEvening = activeTheme === 'evening';

  let colors;
  if (isDark) {
    // Full Night Dark (Deep Midnight)
    colors = {
      background: '#090D16',
      surfaceBg: '#0F1626',
      card: '#131B2E',
      cardBorder: '#1E293B',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      badgeBg: '#1E293B',
      badgeBorder: '#334155',
      badgeText: '#38BDF8',
      headerBg: '#090D16',
      progressTrack: '#1E293B',
    };
  } else if (isEvening) {
    // Evening Twilight (A little dark with warm tone)
    colors = {
      background: '#0F172A',
      surfaceBg: '#1E293B',
      card: '#1E293B',
      cardBorder: '#334155',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      badgeBg: '#1E293B',
      badgeBorder: '#475569',
      badgeText: '#F97316',
      headerBg: '#0F172A',
      progressTrack: '#334155',
    };
  } else {
    // Daytime Light (Clean & Bright)
    colors = {
      background: '#F8FAFC',
      surfaceBg: '#FFFFFF',
      card: '#FFFFFF',
      cardBorder: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#64748B',
      badgeBg: '#FEF3C7',
      badgeBorder: '#FDE68A',
      badgeText: '#B45309',
      headerBg: '#FFFFFF',
      progressTrack: '#E2E8F0',
    };
  }

  return {
    period,
    greetingText,
    emoji,
    iconName,
    iconColor,
    themeMode: activeTheme,
    isDark,
    isEvening,
    colors,
  };
}

/**
 * Persist user theme preference to storage
 */
export async function saveThemePreference(pref: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_PREF_KEY, pref);
  } catch (err) {
    console.warn('[Theme] saveThemePreference error:', err);
  }
}

/**
 * Load user theme preference from storage
 */
export async function getThemePreference(): Promise<ThemePreference> {
  try {
    const raw = await AsyncStorage.getItem(THEME_PREF_KEY);
    if (raw === 'auto' || raw === 'light' || raw === 'evening' || raw === 'dark') {
      return raw;
    }
  } catch (err) {
    console.warn('[Theme] getThemePreference error:', err);
  }
  return 'auto';
}

