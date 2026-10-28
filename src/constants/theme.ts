/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#FFFFFF',
    backgroundElement: '#F8FAFC',
    backgroundSelected: '#E2E8F0',
    textSecondary: '#64748B',
    primary: '#208AEF',
    primaryLight: '#E6F4FE',
    primaryDark: '#1769B2',
    success: '#10B981',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    danger: '#EF4444',
    card: '#FFFFFF',
    border: '#E2E8F0',
    tint: '#208AEF',
  },
  dark: {
    text: '#F8FAFC',
    background: '#090D16',
    backgroundElement: '#131B2E',
    backgroundSelected: '#1E293B',
    textSecondary: '#94A3B8',
    primary: '#208AEF',
    primaryLight: '#1E3A8A',
    primaryDark: '#60A5FA',
    success: '#10B981',
    successLight: '#064E3B',
    warning: '#F59E0B',
    warningLight: '#78350F',
    danger: '#EF4444',
    card: '#131B2E',
    border: '#1E293B',
    tint: '#38BDF8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
