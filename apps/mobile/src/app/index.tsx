import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setCredentials } from '@/redux/slices/authSlice';
import { getUserSession } from '@/utils/authStorage';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeHeaderButton } from '@/components/ThemeHeaderButton';

export default function WelcomeScreen() {
  const { timeTheme } = useAppTheme();
  const dispatch = useAppDispatch();
  const authStateUser = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Auto-redirect if user already has an active session
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        if (isAuthenticated && authStateUser?.id) {
          router.replace('/(tabs)/today');
          return;
        }

        const session = await getUserSession();
        if (isMounted && session?.user?.id) {
          dispatch(
            setCredentials({
              user: session.user,
              token: session.token || undefined,
            })
          );
          router.replace('/(tabs)/today');
          return;
        }
      } catch {
        // Fallback to welcome screen
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authStateUser, dispatch]);

  if (isCheckingSession) {
    return (
      <SafeAreaView
        style={[styles.loadingContainer, { backgroundColor: timeTheme.colors.background }]}>
        <Image
          source={require('@/../assets/images/icon-symbol.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color="#208AEF" style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: timeTheme.colors.background }]}>
      {/* Top Header with Theme Switcher */}
      <View style={styles.headerBar}>
        <View />
        <ThemeHeaderButton size={36} />
      </View>

      {/* Centered Minimal Welcome Area */}
      <View style={styles.centerContent}>
        <View
          style={[
            styles.logoWrapper,
            {
              backgroundColor: timeTheme.isDark ? '#0284C720' : '#E0F2FE',
              borderColor: timeTheme.isDark ? '#0284C740' : '#BAE6FD',
            },
          ]}>
          <Image
            source={require('@/../assets/images/icon-symbol.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.brandTitle, { color: timeTheme.colors.textPrimary }]}>
          MediRem
        </Text>

        <Text style={[styles.brandTagline, { color: timeTheme.colors.textSecondary }]}>
          Smart Medication & Routine Reminder
        </Text>

        <Text style={[styles.brandDescription, { color: timeTheme.colors.textSecondary }]}>
          Never miss a dose. Stay organized, receive spoken voice alerts, and manage your daily health routines with confidence.
        </Text>
      </View>

      {/* Action Buttons: Create Account & Sign In only (No explore button) */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/sign-up')}
          activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Create Account</Text>
          <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            {
              backgroundColor: timeTheme.colors.surfaceBg,
              borderColor: timeTheme.colors.cardBorder,
            },
          ]}
          onPress={() => router.push('/sign-in')}
          activeOpacity={0.75}>
          <Text style={[styles.secondaryBtnText, { color: timeTheme.colors.textPrimary }]}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  logoWrapper: {
    width: 90,
    height: 90,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 20,
    shadowColor: '#208AEF',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  logoImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  brandDescription: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  actionContainer: {
    gap: 12,
    paddingBottom: 28,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#208AEF',
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: '#208AEF',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
