import '@/global.css';

import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from '@/redux';
import { setCredentials, setSessionChecked } from '@/redux/slices/authSlice';
import { getUserSession } from '@/utils/authStorage';

import { Colors } from '@/constants/theme';
import { initializeNotificationService } from '@/utils/notifications';
import { syncOfflineQueue } from '@/utils/offlineSync';

SplashScreen.preventAutoHideAsync().catch(() => {});

function SessionRestoreGate({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getUserSession();
        if (active) {
          if (session?.user?.id) {
            dispatch(
              setCredentials({
                user: session.user,
                token: session.token || undefined,
              })
            );
            // If already logged in, redirect straight to the Home screen
            setTimeout(() => {
              try {
                router.replace('/(tabs)/today');
              } catch {
                // safe fallback if navigator still mounting
              }
            }, 0);

            // Attempt silent background synchronization of any pending offline actions
            syncOfflineQueue(session.token).catch(() => {});
          } else {
            dispatch(setSessionChecked());
          }
        }
      } catch (err) {
        console.warn('[SessionRestoreGate] Error reading session:', err);
        if (active) {
          dispatch(setSessionChecked());
        }
      } finally {
        // Hide splash screen once session restore check completes
        setTimeout(() => {
          SplashScreen.hideAsync().catch(() => {});
        }, 300);
      }
    })();

    // Background timer to flush offline sync queue every 30 seconds when online
    const syncInterval = setInterval(() => {
      syncOfflineQueue().catch(() => {});
    }, 30000);

    return () => {
      active = false;
      clearInterval(syncInterval);
    };
  }, [dispatch]);

  return <>{children}</>;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

  useEffect(() => {
    // Initialize notification channels and permissions
    initializeNotificationService().catch(() => {});
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
