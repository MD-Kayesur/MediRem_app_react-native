import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  badge: string;
  title: string;
  description: string;
  iconType: 'notification' | 'meds' | 'family';
  buttonText: string;
  isFinal?: boolean;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    badge: 'Reliable Reminders',
    title: 'Never Miss\nYour Medication',
    description: 'Get timely reminders and stay on track with your health routines effortlessly.',
    iconType: 'notification',
    buttonText: 'Next',
  },
  {
    id: '2',
    badge: 'Organized Care',
    title: 'Keep Your\nMeds Organized',
    description: 'Add your medications with photos, exact dosages, and customized schedules.',
    iconType: 'meds',
    buttonText: 'Next',
  },
  {
    id: '3',
    badge: 'Caregiver Peace of Mind',
    title: 'Family Support\nWhen It Matters',
    description: 'Let your loved ones stay informed and receive alerts when help is needed.',
    iconType: 'family',
    buttonText: 'Get Started',
    isFinal: true,
  },
];

export default function LandingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSplashPreview, setShowSplashPreview] = useState(false);
  const [isSplashActive, setIsSplashActive] = useState(true);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  useEffect(() => {
    // Show splash screen for 1.8 seconds on initial launch then reveal onboarding
    const timer = setTimeout(() => {
      setIsSplashActive(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.push('/(tabs)/today');
    }
  };

  const handleSkip = () => {
    router.push('/(tabs)/today');
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex >= 0 && newIndex < SLIDES.length) {
      setCurrentIndex(newIndex);
    }
  };

  const renderSlideIllustration = (type: OnboardingSlide['iconType']) => {
    switch (type) {
      case 'notification':
        return (
          <View className="w-60 h-60 items-center justify-center relative" style={styles.illusWrapper}>
            <View className="w-56 h-56 rounded-full bg-blue-100 dark:bg-slate-800 items-center justify-center" style={styles.haloOuter}>
              <View className="w-44 h-44 rounded-full bg-blue-200 dark:bg-sky-950 items-center justify-center" style={styles.haloInner}>
                <View className="w-24 h-36 bg-white rounded-2xl border-[3px] border-sky-500 items-center pt-2 shadow-sm" style={styles.phoneBox}>
                  <View className="w-7 h-1 bg-slate-300 rounded-full mb-3" style={styles.phoneSpeaker} />
                  <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2" style={styles.bellBox}>
                    <Ionicons name="notifications" size={30} color="#208AEF" />
                  </View>
                  <View className="items-center gap-1">
                    <View className="w-12 h-1 bg-slate-200 rounded-full" style={styles.lineWide} />
                    <View className="w-8 h-1 bg-slate-200 rounded-full" style={styles.lineNarrow} />
                  </View>
                </View>
              </View>
            </View>
            <View className="absolute top-2 right-3 w-11 h-11 rounded-full bg-white items-center justify-center shadow-md" style={[styles.floatingBadge, styles.badgeTopRight]}>
              <Ionicons name="alarm-outline" size={20} color="#208AEF" />
            </View>
            <View className="absolute bottom-3 left-3 w-11 h-11 rounded-full bg-white items-center justify-center shadow-md" style={[styles.floatingBadge, styles.badgeBottomLeft]}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            </View>
          </View>
        );

      case 'meds':
        return (
          <View className="w-60 h-60 items-center justify-center relative" style={styles.illusWrapper}>
            <View className="w-56 h-56 rounded-full bg-blue-100 dark:bg-slate-800 items-center justify-center" style={styles.haloOuter}>
              <View className="w-44 h-44 rounded-full bg-blue-200 dark:bg-sky-950 items-center justify-center" style={styles.haloInner}>
                <View className="items-center relative" style={styles.bottleContainer}>
                  <View className="w-11 h-3.5 bg-sky-600 rounded-t-sm" style={styles.bottleCap} />
                  <View className="w-20 h-24 bg-white rounded-b-2xl rounded-t-md border-[3px] border-sky-600 items-center justify-center" style={styles.bottleBody}>
                    <FontAwesome5 name="plus" size={18} color="#208AEF" />
                  </View>
                  <View className="absolute -bottom-1 -right-2 w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-white" style={styles.cameraCircle}>
                    <Ionicons name="camera" size={15} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </View>
            <View className="absolute top-8 left-6 w-11 h-11 rounded-full bg-white items-center justify-center shadow-md" style={[styles.floatingBadge, { top: 32, left: 24 }]}>
              <MaterialCommunityIcons name="pill" size={22} color="#10B981" />
            </View>
            <View className="absolute bottom-6 right-6 w-11 h-11 rounded-full bg-white items-center justify-center shadow-md" style={[styles.floatingBadge, { bottom: 24, right: 24 }]}>
              <MaterialCommunityIcons name="pill" size={22} color="#208AEF" />
            </View>
          </View>
        );

      case 'family':
        return (
          <View className="w-60 h-60 items-center justify-center relative" style={styles.illusWrapper}>
            <View className="w-56 h-56 rounded-full bg-emerald-100 dark:bg-slate-800 items-center justify-center" style={[styles.haloOuter, { backgroundColor: '#DCFCE7' }]}>
              <View className="w-44 h-44 rounded-full bg-emerald-200 dark:bg-emerald-950 items-center justify-center" style={[styles.haloInner, { backgroundColor: '#BBF7D0' }]}>
                <View className="w-24 h-24 rounded-full bg-white items-center justify-center shadow-sm" style={styles.familyCenter}>
                  <Ionicons name="people" size={54} color="#10B981" />
                </View>
              </View>
            </View>
            <View className="absolute top-2 right-3 w-11 h-11 rounded-full bg-rose-50 items-center justify-center shadow-md" style={[styles.floatingBadge, styles.badgeTopRight, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="heart" size={20} color="#EF4444" />
            </View>
            <View className="absolute bottom-3 left-3 w-11 h-11 rounded-full bg-emerald-50 items-center justify-center shadow-md" style={[styles.floatingBadge, styles.badgeBottomLeft, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            </View>
          </View>
        );
    }
  };

  // Full-Screen Splash with Centered Logo & MediRem Title
  if (isSplashActive || showSplashPreview) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900" style={styles.container}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setIsSplashActive(false);
            setShowSplashPreview(false);
          }}
          className="flex-1 items-center justify-center px-8"
          style={styles.splashContent}>
          {/* Full MediRem Brand Logo (Icon + Wordmark) */}
          <View className="mb-2 items-center" style={styles.splashLogoWrapper}>
            <Image
              source={require('@/../assets/images/medirem-logo.png')}
              style={styles.splashLogoImg}
              resizeMode="contain"
            />
          </View>

          {/* Subtitle / Tagline */}
          <Text className="text-base font-medium text-slate-500 dark:text-slate-400 mb-16" style={styles.splashSub}>
            Your Smart Medication Companion
          </Text>

          {/* Footer Loader & Dismiss */}
          <View className="absolute bottom-10 items-center w-full" style={styles.splashFooter}>
            <Text className="text-xs text-slate-400 mb-4" style={styles.splashLoading}>
              Loading companion...
            </Text>
            <TouchableOpacity
              className="py-2.5 px-6 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              style={styles.splashBackBtn}
              onPress={() => {
                setIsSplashActive(false);
                setShowSplashPreview(false);
              }}
              activeOpacity={0.8}>
              <Text className="text-sm font-semibold text-primary" style={styles.splashBackBtnText}>
                {showSplashPreview ? 'Back to Onboarding' : 'Tap to Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentSlide = SLIDES[currentIndex];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900" style={styles.container}>
      {/* Top Header Bar */}
      <View className="flex-row justify-between items-center px-6 pt-2 pb-1" style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => setShowSplashPreview(true)}
          className="flex-row items-center gap-2 bg-blue-50 dark:bg-slate-800 px-3 py-1.5 rounded-full"
          style={styles.brandPill}
          activeOpacity={0.7}>
          <Image
            source={require('@/../assets/images/icon-symbol.png')}
            style={{ width: 22, height: 22, borderRadius: 6 }}
            resizeMode="contain"
          />
          <Text className="text-sm font-bold text-slate-900 dark:text-white tracking-wide" style={styles.brandText}>
            MediRem
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} className="py-1.5 px-3" style={styles.skipBtn} activeOpacity={0.7}>
          <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400" style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Onboarding Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[{ width: SCREEN_WIDTH }, styles.slideBox]} className="items-center justify-center px-7">
            {/* Visual Illustration */}
            <View className="h-72 w-full items-center justify-center mt-2" style={styles.illusArea}>
              {renderSlideIllustration(item.iconType)}
            </View>

            {/* Content Text */}
            <View className="items-center px-2 mt-2" style={styles.textArea}>
              <View className="px-3 py-1 rounded-full mb-3 bg-slate-100 dark:bg-slate-800" style={styles.badgePill}>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-primary" style={styles.badgeText}>
                  {item.badge}
                </Text>
              </View>

              <Text className="text-3xl font-extrabold text-center text-slate-900 dark:text-white leading-9 mb-3" style={styles.slideTitle}>
                {item.title}
              </Text>
              <Text className="text-sm text-center text-slate-500 dark:text-slate-400 leading-5 max-w-xs" style={styles.slideDesc}>
                {item.description}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Bottom Controls Area */}
      <View className="px-7 pb-4 items-center" style={styles.bottomControls}>
        {/* Pagination Dots */}
        <View className="flex-row items-center justify-center gap-2 mb-6" style={styles.dotsRow}>
          {SLIDES.map((_, index) => {
            const isActive = index === currentIndex;
            const activeColor = currentIndex === 2 ? '#10B981' : '#208AEF';
            return (
              <View
                key={index}
                className={`h-2 rounded-full ${
                  isActive
                    ? currentIndex === 2 ? 'w-7 bg-emerald-500' : 'w-7 bg-primary'
                    : 'w-2 bg-slate-200 dark:bg-slate-700'
                }`}
                style={[
                  styles.dot,
                  isActive
                    ? [styles.dotActive, { backgroundColor: activeColor }]
                    : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          className={`w-full h-14 rounded-full flex-row items-center justify-center shadow-md active:opacity-90 ${
            currentSlide.isFinal ? 'bg-emerald-500' : 'bg-primary'
          }`}
          style={[
            styles.primaryBtn,
            { backgroundColor: currentSlide.isFinal ? '#10B981' : '#208AEF' },
          ]}
          onPress={handleNext}
          activeOpacity={0.85}>
          <Text className="text-white text-base font-bold" style={styles.primaryBtnText}>
            {currentSlide.buttonText}
          </Text>
          <Ionicons
            name={currentSlide.isFinal ? 'checkmark-circle' : 'arrow-forward'}
            size={19}
            color="#FFFFFF"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>

        {/* Secondary Action */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/today')}
          className="mt-3.5 py-1.5"
          style={styles.secondaryBtn}
          activeOpacity={0.7}>
          <Text className="text-sm text-slate-500 dark:text-slate-400" style={styles.secondaryBtnText}>
            Already have an account?{' '}
            <Text className="text-primary font-semibold" style={{ color: '#208AEF', fontWeight: '700' }}>
              Sign In
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Safety Disclaimer */}
        <Text className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-3 opacity-80" style={styles.disclaimer}>
          MediRem is a personal reminder aid and does not provide clinical advice.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  brandIconSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  slideBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  illusArea: {
    height: 270,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  illusWrapper: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  haloOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloInner: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneBox: {
    width: 96,
    height: 136,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#0284C7',
    alignItems: 'center',
    paddingTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  phoneSpeaker: {
    width: 28,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    marginBottom: 14,
  },
  bellBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  lineWide: {
    width: 48,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 4,
  },
  lineNarrow: {
    width: 32,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  floatingBadge: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  badgeTopRight: {
    top: 8,
    right: 12,
  },
  badgeBottomLeft: {
    bottom: 12,
    left: 12,
  },
  bottleContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  bottleCap: {
    width: 44,
    height: 14,
    backgroundColor: '#0284C7',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  bottleBody: {
    width: 78,
    height: 94,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 3,
    borderColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCircle: {
    position: 'absolute',
    bottom: -6,
    right: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  familyCenter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#208AEF',
    letterSpacing: 0.5,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0F172A',
    lineHeight: 36,
    marginBottom: 10,
  },
  slideDesc: {
    fontSize: 14,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 21,
    maxWidth: 320,
  },
  bottomControls: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#CBD5E1',
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 14,
    paddingVertical: 6,
  },
  secondaryBtnText: {
    fontSize: 14,
    color: '#64748B',
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 10,
  },
  splashContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  splashLogoWrapper: {
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoImg: {
    width: 220,
    height: 220,
  },
  splashLogo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashCheck: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  splashTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  splashSub: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 50,
  },
  splashFooter: {
    position: 'absolute',
    bottom: 36,
    alignItems: 'center',
    width: '100%',
  },
  splashLoading: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
  },
  splashBackBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  splashBackBtnText: {
    color: '#208AEF',
    fontWeight: '600',
    fontSize: 14,
  },
});
