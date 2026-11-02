import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setCredentials } from '@/redux/slices/authSlice';
import { saveUserSession, getUserSession } from '@/utils/authStorage';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeHeaderButton } from '@/components/ThemeHeaderButton';
import { AuthUser } from '@medirem/types';

export default function LandingScreen() {
  const { timeTheme } = useAppTheme();
  const dispatch = useAppDispatch();
  const authStateUser = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Immediate Persistent Session Check:
  // If user is already authenticated or has a stored session, go straight to Today screen
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
        // Fallback to landing if session read fails
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

  const handleGuestAccess = async () => {
    const guestUser: AuthUser = {
      id: `guest_${Date.now()}`,
      name: 'Guest User',
      email: 'guest@medirem.app',
      role: 'USER',
      createdAt: new Date().toISOString(),
    };
    await saveUserSession(guestUser);
    dispatch(setCredentials({ user: guestUser }));
    router.replace('/(tabs)/today');
  };

  // While checking existing session, show sleek loading indicator
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
      {/* Top Header */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: timeTheme.colors.headerBg,
            borderBottomColor: timeTheme.colors.cardBorder,
          },
        ]}>
        <View style={styles.brandRow}>
          <Image
            source={require('@/../assets/images/icon-symbol.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.brandTitle, { color: timeTheme.colors.textPrimary }]}>
              MediRem
            </Text>
            <Text style={[styles.brandSub, { color: timeTheme.colors.textSecondary }]}>
              Health Companion
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <ThemeHeaderButton size={34} />
          <TouchableOpacity
            onPress={() => router.push('/sign-in')}
            style={[
              styles.headerSignInBtn,
              {
                backgroundColor: timeTheme.colors.surfaceBg,
                borderColor: timeTheme.colors.cardBorder,
              },
            ]}
            activeOpacity={0.7}
            accessibilityLabel="Sign in">
            <Text style={styles.headerSignInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor: timeTheme.isDark ? '#0284C720' : '#E0F2FE',
                borderColor: timeTheme.isDark ? '#0284C750' : '#BAE6FD',
              },
            ]}>
            <Ionicons name="sparkles" size={13} color="#208AEF" />
            <Text style={styles.heroBadgeText}>Intelligent Medication & Care</Text>
          </View>

          <Text style={[styles.heroTitle, { color: timeTheme.colors.textPrimary }]}>
            Never Miss a Dose,\nStay in Full Control.
          </Text>

          <Text style={[styles.heroDescription, { color: timeTheme.colors.textSecondary }]}>
            Your reliable companion for accurate medication routines, spoken voice reminders,
            adherence tracking, and instant 24/7 AI health guidance.
          </Text>

          {/* Primary Action Buttons */}
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={styles.primaryCtaBtn}
              onPress={() => router.push('/sign-up')}
              activeOpacity={0.85}>
              <Text style={styles.primaryCtaText}>Create Free Account</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.guestCtaBtn,
                {
                  backgroundColor: timeTheme.colors.surfaceBg,
                  borderColor: timeTheme.colors.cardBorder,
                },
              ]}
              onPress={handleGuestAccess}
              activeOpacity={0.75}>
              <Text style={[styles.guestCtaText, { color: timeTheme.colors.textPrimary }]}>
                Explore as Guest
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Why Use MediRem / কী কী কাজে ব্যবহার করবেন */}
        <View style={styles.sectionArea}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionHeading, { color: timeTheme.colors.textPrimary }]}>
              Why Use MediRem?
            </Text>
            <Text style={[styles.sectionSubHeading, { color: timeTheme.colors.textSecondary }]}>
              Everything you need to manage medications safely and effortlessly
            </Text>
          </View>

          {/* Feature Card 1: Smart Alarms */}
          <View
            style={[
              styles.featureCard,
              {
                backgroundColor: timeTheme.colors.card,
                borderColor: timeTheme.colors.cardBorder,
              },
            ]}>
            <View style={[styles.featureIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="alarm" size={24} color="#208AEF" />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: timeTheme.colors.textPrimary }]}>
                Reliable Medication Alarms
              </Text>
              <Text style={[styles.featureDesc, { color: timeTheme.colors.textSecondary }]}>
                Choose from clinical ringtones, medical beepers, and vibration patterns that ring
                at exact scheduled times so you never miss a morning or evening pill.
              </Text>
            </View>
          </View>

          {/* Feature Card 2: Spoken Voice Alerts */}
          <View
            style={[
              styles.featureCard,
              {
                backgroundColor: timeTheme.colors.card,
                borderColor: timeTheme.colors.cardBorder,
              },
            ]}>
            <View style={[styles.featureIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="mic" size={24} color="#10B981" />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: timeTheme.colors.textPrimary }]}>
                Spoken Medicine Voice Alerts
              </Text>
              <Text style={[styles.featureDesc, { color: timeTheme.colors.textSecondary }]}>
                Your phone clearly speaks the medicine name out loud (e.g. &quot;Time to take your
                Aspirin 500mg!&quot;). Hear your reminders without needing to read the screen.
              </Text>
            </View>
          </View>

          {/* Feature Card 3: 24/7 AI Health Assistant */}
          <View
            style={[
              styles.featureCard,
              {
                backgroundColor: timeTheme.colors.card,
                borderColor: timeTheme.colors.cardBorder,
              },
            ]}>
            <View style={[styles.featureIconBox, { backgroundColor: '#FAF5FF' }]}>
              <Ionicons name="sparkles" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: timeTheme.colors.textPrimary }]}>
                24/7 AI Health Companion
              </Text>
              <Text style={[styles.featureDesc, { color: timeTheme.colors.textSecondary }]}>
                Ask questions about your prescription schedules, food interactions, side effects,
                or what to do if you missed a dose, anytime with privacy.
              </Text>
            </View>
          </View>

          {/* Feature Card 4: Intake History & Adherence */}
          <View
            style={[
              styles.featureCard,
              {
                backgroundColor: timeTheme.colors.card,
                borderColor: timeTheme.colors.cardBorder,
              },
            ]}>
            <View style={[styles.featureIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="stats-chart" size={24} color="#F59E0B" />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: timeTheme.colors.textPrimary }]}>
                Intake History & Adherence
              </Text>
              <Text style={[styles.featureDesc, { color: timeTheme.colors.textSecondary }]}>
                Mark each dose as Taken or Skipped in one tap. Track your adherence percentage and
                keep full intake records ready for your doctor appointments.
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Who Should Use MediRem? */}
        <View
          style={[
            styles.useCasesBox,
            {
              backgroundColor: timeTheme.colors.surfaceBg,
              borderColor: timeTheme.colors.cardBorder,
            },
          ]}>
          <Text style={[styles.useCasesTitle, { color: timeTheme.colors.textPrimary }]}>
            Who is MediRem for?
          </Text>

          <View style={styles.useCaseItem}>
            <View style={styles.useCaseDot} />
            <Text style={[styles.useCaseText, { color: timeTheme.colors.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: timeTheme.colors.textPrimary }}>
                Daily Prescription Users:{' '}
              </Text>
              Keep multiple prescriptions and dosages clearly organized and never double-dose.
            </Text>
          </View>

          <View style={styles.useCaseItem}>
            <View style={styles.useCaseDot} />
            <Text style={[styles.useCaseText, { color: timeTheme.colors.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: timeTheme.colors.textPrimary }}>
                Families & Caregivers:{' '}
              </Text>
              Ensure elderly parents or children stay on track with their prescribed routines.
            </Text>
          </View>

          <View style={styles.useCaseItem}>
            <View style={styles.useCaseDot} />
            <Text style={[styles.useCaseText, { color: timeTheme.colors.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: timeTheme.colors.textPrimary }}>
                Vitamins & Supplements:{' '}
              </Text>
              Build consistent daily habits for vitamins, wellness supplements, and health goals.
            </Text>
          </View>
        </View>

        {/* Privacy & Safe Cloud Sync Guarantee (Zero technical jargon) */}
        <View
          style={[
            styles.privacyCard,
            {
              backgroundColor: timeTheme.isDark ? '#064E3B20' : '#ECFDF5',
              borderColor: timeTheme.isDark ? '#064E3B50' : '#A7F3D0',
            },
          ]}>
          <View style={styles.privacyIconRow}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.privacyTitle}>Private, Safe & Synchronized</Text>
          </View>
          <Text style={[styles.privacySub, { color: timeTheme.colors.textSecondary }]}>
            Your health records belong strictly to you. When you switch devices or log in, your
            routines and intake logs are automatically restored safely.
          </Text>
        </View>

        {/* Bottom Call to Action Card */}
        <View
          style={[
            styles.bottomCtaCard,
            {
              backgroundColor: timeTheme.colors.card,
              borderColor: timeTheme.colors.cardBorder,
            },
          ]}>
          <Text style={[styles.bottomCtaTitle, { color: timeTheme.colors.textPrimary }]}>
            Ready to Take Control of Your Health?
          </Text>
          <Text style={[styles.bottomCtaSub, { color: timeTheme.colors.textSecondary }]}>
            Create your free account today and start your organized routine in seconds.
          </Text>

          <TouchableOpacity
            style={styles.bottomPrimaryBtn}
            onPress={() => router.push('/sign-up')}
            activeOpacity={0.85}>
            <Text style={styles.bottomPrimaryBtnText}>Get Started Now</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/sign-in')}
            style={styles.bottomSecondaryBtn}
            activeOpacity={0.7}>
            <Text style={[styles.bottomSecondaryText, { color: timeTheme.colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: '#208AEF', fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Footer */}
        <View style={styles.footerArea}>
          <Text style={[styles.footerText, { color: timeTheme.colors.textSecondary }]}>
            MediRem • Smart Health & Medication Companion
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSignInBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  headerSignInText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#208AEF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    textAlign: 'center',
    paddingVertical: 12,
    marginBottom: 24,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#208AEF',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
    marginBottom: 24,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  primaryCtaBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#208AEF',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guestCtaBtn: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  guestCtaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionArea: {
    marginBottom: 24,
    gap: 12,
  },
  sectionTitleRow: {
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sectionSubHeading: {
    fontSize: 13,
    lineHeight: 18,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  featureIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  useCasesBox: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  useCasesTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  useCaseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  useCaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#208AEF',
    marginTop: 6,
  },
  useCaseText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  privacyCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  privacyIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  privacySub: {
    fontSize: 12,
    lineHeight: 18,
  },
  bottomCtaCard: {
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 20,
  },
  bottomCtaTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  bottomCtaSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
    marginBottom: 18,
  },
  bottomPrimaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#208AEF',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  bottomPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomSecondaryBtn: {
    paddingVertical: 4,
  },
  bottomSecondaryText: {
    fontSize: 13,
  },
  footerArea: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
