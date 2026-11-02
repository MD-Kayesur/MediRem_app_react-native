import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setThemePreference } from '@/redux/slices/themeSlice';
import {
  getTimeGreetingThemeDetails,
  getThemePreference,
  saveThemePreference,
  ThemePreference,
  TimeGreetingThemeDetails,
} from '@/utils/timeGreetingTheme';

export function useAppTheme() {
  const dispatch = useAppDispatch();
  const themePref = useAppSelector((state) => state.theme.preference);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Load saved preference on first mount
  useEffect(() => {
    let active = true;
    getThemePreference().then((saved) => {
      if (active && saved) {
        dispatch(setThemePreference(saved));
      }
    });
    // Interval for dynamic time transitions (Morning -> Noon -> Evening -> Night)
    const timer = setInterval(() => {
      if (active) setCurrentTime(new Date());
    }, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [dispatch]);

  const timeTheme: TimeGreetingThemeDetails = useMemo(() => {
    return getTimeGreetingThemeDetails(currentTime, themePref);
  }, [currentTime, themePref]);

  const toggleTheme = useCallback(async () => {
    let nextPref: ThemePreference = 'auto';
    if (themePref === 'auto') nextPref = 'light';
    else if (themePref === 'light') nextPref = 'evening';
    else if (themePref === 'evening') nextPref = 'dark';
    else nextPref = 'auto';

    dispatch(setThemePreference(nextPref));
    await saveThemePreference(nextPref);

    const modeLabels: Record<ThemePreference, string> = {
      auto: 'Automatic 🕒 (Morning ☀️, Noon 🌤️, Evening 🌇, Night 🌙)',
      light: 'Light Theme ☀️ (Daytime Light)',
      evening: 'Twilight Theme 🌇 (Soft Evening Dark)',
      dark: 'Dark Theme 🌙 (Full Night Dark)',
    };

    Alert.alert(
      'Theme Mode Changed',
      `Active theme: ${modeLabels[nextPref]}\n\nTheme updates instantly across all screens (Home, Meds, AI Bot, History, Profile).`,
      [{ text: 'OK' }],
    );
  }, [themePref, dispatch]);

  return {
    themePref,
    timeTheme,
    toggleTheme,
    currentTime,
  };
}

