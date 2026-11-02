import '@/global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from '@/redux';
import { setCredentials } from '@/redux/slices/authSlice';
import { getUserSession } from '@/utils/authStorage';

import { Colors } from '@/constants/theme';
import { initializeNotificationService } from '@/utils/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

function SessionRestoreGate({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getUserSession();
        if (active && session?.user?.id) {
          dispatch(
            setCredentials({
              user: session.user,
              token: session.token || undefined,
            })
          );
        }
      } catch (err) {
        console.warn('[SessionRestoreGate] Error reading session:', err);
      }
    })();

    return () => {
      active = false;
    };
  }, [dispatch]);

  return <>{children}</>;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

  useEffect(() => {
    // Hide native splash screen once React hierarchy is mounted
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 500);

    // Initialize notification channels and permissions
    initializeNotificationService().catch(() => {});

    return () => clearTimeout(timer);
  }, []);

  return (
    <Provider store={store}>
      <SessionRestoreGate>
        <SafeAreaProvider>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="sign-up" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </SessionRestoreGate>
    </Provider>
  );
}
