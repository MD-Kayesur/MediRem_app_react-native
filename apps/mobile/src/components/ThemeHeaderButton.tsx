import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ThemeHeaderButtonProps {
  size?: number;
}

export function ThemeHeaderButton({ size = 38 }: ThemeHeaderButtonProps) {
  const { themePref, timeTheme, toggleTheme } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[
        styles.themeBtn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: timeTheme.colors.surfaceBg,
          borderColor: timeTheme.colors.cardBorder,
        },
      ]}
      activeOpacity={0.75}
      accessibilityLabel="Switch Day/Night Theme"
      accessibilityRole="button">
      <Ionicons name={timeTheme.iconName} size={size > 36 ? 20 : 18} color={timeTheme.iconColor} />
      {themePref === 'auto' && (
        <View
          style={[
            styles.themeAutoBadge,
            {
              backgroundColor: timeTheme.colors.badgeBg,
              borderColor: timeTheme.colors.badgeBorder,
            },
          ]}>
          <Text
            style={[
              styles.themeAutoBadgeText,
              { color: timeTheme.colors.badgeText },
            ]}>
            A
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  themeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  themeAutoBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeAutoBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
});
