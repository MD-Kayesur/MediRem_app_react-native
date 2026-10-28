import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useColorScheme,
  Platform,
  Pressable,
  Animated,
  StyleSheet,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';

interface TabButtonProps {
  children: React.ReactNode;
  onPress?: (e: any) => void;
  accessibilityState?: { selected?: boolean };
  style?: any;
}

function AnimatedTabBarButton({
  children,
  onPress,
  accessibilityState,
  style,
  ...rest
}: TabButtonProps) {
  const focused = accessibilityState?.selected;
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.86,
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
        {focused && <View style={styles.activePill} />}
        <View style={styles.childrenWrapper}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

export default function TabLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
        tabBarActiveTintColor: '#208AEF',
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.25 : 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -3 },
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="today"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meds"
        options={{
          title: 'Meds',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="pill"
              size={22}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color as string}
            />
          ),
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
    paddingVertical: 4,
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
  activePill: {
    position: 'absolute',
    top: -2,
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6F4FE',
    zIndex: 0,
  },
  childrenWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
