import React, { useState } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useColorScheme,
  Platform,
  Pressable,
  Animated,
  StyleSheet,
  View,
  Text,
} from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

interface TabButtonProps {
  children?: React.ReactNode;
  onPress?: (e: any) => void;
  onLongPress?: (e: any) => void;
  accessibilityState?: { selected?: boolean };
  style?: any;
}

interface FloatingAiTabProps extends TabButtonProps {
  isDark: boolean;
  screenBg: string;
  borderColor: string;
}

/**
 * Animated Scale Button for Standard Tabs (Home, Meds, History, Profile)
 */
function AnimatedTabBarButton({
  children,
  onPress,
  style,
  ...rest
}: TabButtonProps) {
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 14,
    }).start();
  };

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [
        style,
        styles.tabPressable,
        pressed && styles.tabPressed,
      ]}>
      <Animated.View
        style={[
          styles.tabContent,
          { transform: [{ scale: scaleAnim }] },
        ]}>
        <View style={styles.childrenWrapper}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Elevated, Scooped Floating Button for AI Bot (Center Tab)
 * Matches the reference design with a curved notch cradle & raised floating circle.
 */
function FloatingAiTabButton({
  onPress,
  onLongPress,
  accessibilityState,
  isDark,
  screenBg,
  borderColor,
  style,
}: FloatingAiTabProps) {
  const focused = accessibilityState?.selected;
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 12,
    }).start();
  };

  const handlePress = (e: any) => {
    if (onPress) {
      onPress(e);
    } else {
      router.push('/(tabs)/chatbot');
    }
  };

  return (
    <View style={[styles.floatingCenterContainer, style]} pointerEvents="box-none">
      {/* Concave Scoop / Notch Cutout (blends with the screen background above) */}
      <View
        style={[
          styles.notchCutout,
          {
            backgroundColor: screenBg,
            borderColor,
          },
        ]}
      />

      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.floatingPressable}
        accessibilityRole="button"
        accessibilityLabel="AI Bot Assistant"
        accessibilityState={{ selected: focused }}>
        <Animated.View
          style={[
            styles.floatingCircle,
            { transform: [{ scale: scaleAnim }] },
            focused && styles.floatingCircleActive,
            isDark && styles.floatingCircleDark,
          ]}>
          <Ionicons
            name="sparkles"
            size={25}
            color="#FFFFFF"
          />
        </Animated.View>
        <Text
          style={[
            styles.floatingLabel,
            {
              color: focused
                ? '#208AEF'
                : isDark
                ? '#94A3B8'
                : '#64748B',
              fontWeight: focused ? '800' : '600',
            },
          ]}>
          AI Bot
        </Text>
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  const scheme = useColorScheme();
  const { themePref, timeTheme } = useAppTheme();
  const isDarkTheme = timeTheme.isDark || (themePref === 'auto' && scheme === 'dark');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
        tabBarActiveTintColor: '#208AEF',
        tabBarInactiveTintColor: isDarkTheme ? '#94A3B8' : '#64748B',
        tabBarStyle: {
          backgroundColor: timeTheme.colors.surfaceBg,
          borderTopColor: timeTheme.colors.cardBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
          paddingTop: 6,
          overflow: 'visible',
          position: 'relative',
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: isDarkTheme ? 0.35 : 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -3 },
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
      }}>
      {/* 1. Today / Home Tab */}
      <Tabs.Screen
        name="today"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={23}
              color={color as string}
            />
          ),
        }}
      />

      {/* 2. Meds Tab */}
      <Tabs.Screen
        name="meds"
        options={{
          title: 'Meds',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="pill"
              size={23}
              color={color as string}
            />
          ),
        }}
      />

      {/* 3. AI Bot Tab (Center Elevated Button) */}
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'AI Bot',
          tabBarButton: (props) => (
            <FloatingAiTabButton
              {...props}
              isDark={isDarkTheme}
              screenBg={timeTheme.colors.background}
              borderColor={timeTheme.colors.cardBorder}
            />
          ),
        }}
      />

      {/* 4. History Tab */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={23}
              color={color as string}
            />
          ),
        }}
      />

      {/* 5. Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={23}
              color={color as string}
            />
          ),
        }}
      />

      {/* 6. Support Screen (Preserves bottom tab navigation bar while hidden from tab bar buttons) */}
      <Tabs.Screen
        name="support"
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabPressed: {
    opacity: 0.85,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  childrenWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  // Floating AI Center Button Styles
  floatingCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
    zIndex: 10,
  },
  notchCutout: {
    position: 'absolute',
    top: -24,
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
    zIndex: 1,
  },
  floatingPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -16,
    zIndex: 2,
  },
  floatingCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  floatingCircleActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#93C5FD',
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  floatingCircleDark: {
    borderColor: '#1E293B',
  },
  floatingLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
