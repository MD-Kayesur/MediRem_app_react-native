import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { triggerAudibleAlarm, stopAudibleAlarm } from '@/utils/alarm';
import {
  checkRoutineForToday,
  isDoseTakenToday,
  getMedicationDoseSlots,
} from '@/utils/routineSchedule';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/slices/authSlice';
import { useGetMedicationsQuery, useTakeDoseMutation } from '@/redux';

interface DoseItem {
  id: string;
  medicationId: string;
  timeSlot: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | string;
  time: string;
  medicationName: string;
  dosage: string;
  status: 'taken' | 'pending';
  imageUri?: string;
  isScheduledToday?: boolean;
  isOutOfStock?: boolean;
  pillsLeft?: number;
}

function getNextDoseTarget(timeStr?: string): Date {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      target.setHours(h, m, 0, 0);
      return target;
    }
  }

  target.setHours(20, 0, 0, 0);
  return target;
}

function getCountdownInfo(timeStr: string | undefined, now: Date): {
  text: string;
  isDue: boolean;
  isLate: boolean;
  isUrgent: boolean;
  lateSecs: number;
} {
  const target = getNextDoseTarget(timeStr);
  const diffMs = target.getTime() - now.getTime();
  const pad = (n: number) => n.toString().padStart(2, '0');

  // If past scheduled dose time (LATE / OVERDUE!)
  if (diffMs <= 0) {
    const lateSecs = Math.floor(Math.abs(diffMs) / 1000);
    const lateHours = Math.floor(lateSecs / 3600);
    const lateMins = Math.floor((lateSecs % 3600) / 60);
    const lateSecsRem = lateSecs % 60;

    let lateText: string;
    if (lateHours > 0) {
      lateText = `Late: ${lateHours}h ${pad(lateMins)}m ${pad(lateSecsRem)}s`;
    } else {
      lateText = `Late: ${pad(lateMins)}m ${pad(lateSecsRem)}s`;
    }

    return {
      text: lateText,
      isDue: true,
      isLate: true,
      isUrgent: true,
      lateSecs,
    };
  }

  // Future scheduled dose time (REMAINING TIME!)
  const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hours > 0) {
    return {
      text: `${hours}h ${pad(mins)}m ${pad(secs)}s`,
      isDue: false,
      isLate: false,
      isUrgent: false,
      lateSecs: 0,
    };
  }

  return {
    text: `${pad(mins)}m ${pad(secs)}s`,
    isDue: false,
    isLate: false,
    isUrgent: mins <= 10,
    lateSecs: 0,
  };
}


export default function HomeScreen() {
  const user = useAppSelector(selectCurrentUser);
  const activeUserId = user?.id;

  // Real data from Neon Cloud PostgreSQL
  const {
    data: dbMeds = [],
    isFetching: isMedsFetching,
    refetch: refetchMeds,
  } = useGetMedicationsQuery(activeUserId, {
    refetchOnMountOrArgChange: true,
  });

  const [takeDoseMutation] = useTakeDoseMutation();

  const [takenIds, setTakenIds] = useState<Set<string>>(() => new Set());
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Dynamically derive today's dose cards directly from Neon database rows
  // Supports multiple doses per day (e.g. 1, 2, 3 times daily: Morning, Noon, Night):
  // 1. Expands every medication into its scheduled daily time slots
  // 2. Checks if taken today in Neon DB doseLogs or local intake for that specific dose slot
  // 3. Checks inventory (pillsLeft) -> marks out of stock
  // 4. Checks schedule days of week & dates -> sets isScheduledToday
  const doses: DoseItem[] = useMemo(() => {
    const list = dbMeds || [];
    const items: DoseItem[] = [];

    list.forEach((item: any) => {
      const medId = item.id;
      if (!medId) return;

      const routineCheck = checkRoutineForToday(item, currentTime);
      const slots = getMedicationDoseSlots(item);

      slots.forEach((slot) => {
        const doseKey = `${medId}_${slot.slot}_${slot.time.replace(/[:\s]/g, '')}`;
        const isTaken = isDoseTakenToday(item, takenIds, slot.time) || takenIds.has(doseKey);

        items.push({
          id: doseKey,
          medicationId: medId,
          timeSlot: slot.slot,
          time: slot.time,
          medicationName: item.name || item.medicationName,
          dosage: item.dosage,
          status: isTaken ? 'taken' : 'pending',
          imageUri: item.imageUri || undefined,
          isScheduledToday: routineCheck.isScheduledToday,
          isOutOfStock: routineCheck.isOutOfStock,
          pillsLeft: routineCheck.pillsLeft,
        });
      });
    });

    return items;
  }, [dbMeds, takenIds, currentTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayAlarmedRef = useRef<Set<string>>(new Set());

  // Automatic Due-Time Alarm Detection on Today screen
  // Enforces:
  // 1. If taken today -> STOP & DO NOT RING ALARM
  // 2. If out of stock (pillsLeft <= 0) -> DO NOT RING ALARM
  // 3. If not scheduled for today (e.g. weekend on weekday routine) -> DO NOT RING ALARM
  useEffect(() => {
    doses.forEach((item) => {
      // 1. If already taken today -> NEVER RING ALARM!
      if (item.status === 'taken') return;

      // 2. If zero pills left in inventory -> NEVER RING ALARM!
      if (item.isOutOfStock || (item.pillsLeft !== undefined && item.pillsLeft <= 0)) return;

      // 3. If not scheduled today based on day of week or dates -> NEVER RING ALARM!
      if (item.isScheduledToday === false) return;

      const info = getCountdownInfo(item.time, currentTime);
      if (info.isDue) {
        const key = `today_${item.id}_${currentTime.toDateString()}_${item.time}`;
        if (!todayAlarmedRef.current.has(key)) {
          todayAlarmedRef.current.add(key);
          triggerAudibleAlarm();
        }
      }
    });
  }, [currentTime, doses]);

  const takenCount = doses.filter((d) => d.status === 'taken').length;
  const totalCount = doses.length;
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const toggleDose = async (id: string) => {
    // 1. Immediately silence ringing audio alarm!
    stopAudibleAlarm();
    const doseItem = doses.find((d) => d.id === id);
    const medId = doseItem?.medicationId || id;
    const scheduledTime = doseItem?.time;

    const isCurrentlyTaken = takenIds.has(id) || doseItem?.status === 'taken';

    setTakenIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyTaken) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    // 2. Mark alarm key as silenced for today
    const alarmKey = `today_${id}_${currentTime.toDateString()}`;
    todayAlarmedRef.current.add(alarmKey);

    // 3. Persist intake and decrement pill count in Neon Cloud PostgreSQL
    if (!isCurrentlyTaken) {
      try {
        await takeDoseMutation({ id: medId, scheduledTime }).unwrap();
      } catch (e) {
        console.warn('Take dose DB call error:', e);
      }
    }
  };

  const handleTestDoseAlarm = (item: DoseItem) => {
    triggerAudibleAlarm();
    Alert.alert(
      `🚨 Alarm: ${item.medicationName} (${item.dosage})`,
      `Alarm ringing continuously for 1 full minute. If not stopped permanently, it will alarm again in 3 minutes.`,
      [
        {
          text: 'Take Dose & Stop Permanently',
          onPress: () => toggleDose(item.id),
        },
        {
          text: 'Stop Alarm Permanently',
          style: 'destructive',
          onPress: () => {
            stopAudibleAlarm();
            const key = `today_${item.id}_${currentTime.toDateString()}_${item.time}`;
            todayAlarmedRef.current.add(key);
          },
        },
      ]
    );
  };

  const getSlotDetails = (slot: DoseItem['timeSlot']) => {
    switch (slot) {
      case 'Morning':
        return { icon: 'sunny' as const, bg: '#DCFCE7', color: '#10B981' };
      case 'Afternoon':
      case 'Noon':
        return { icon: 'partly-sunny' as const, bg: '#E6F4FE', color: '#208AEF' };
      case 'Evening':
        return { icon: 'cloudy-night' as const, bg: '#FEF3C7', color: '#F59E0B' };
      case 'Night':
        return { icon: 'moon' as const, bg: '#EEF2FF', color: '#6366F1' };
      default:
        return { icon: 'alarm-outline' as const, bg: '#E6F4FE', color: '#208AEF' };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900" style={styles.container}>
      {/* Top Header */}
      <View className="px-5 pt-2 pb-3" style={styles.header}>
        <View className="flex-row justify-between items-center" style={styles.headerRow}>
          <TouchableOpacity
            className="flex-row items-center gap-3"
            style={styles.avatarRow}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}>
            <View className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-800 items-center justify-center border border-primary" style={styles.avatarCircle}>
              <Ionicons name="person" size={20} color="#208AEF" />
            </View>
            <View className="justify-center">
              <Text className="text-xs font-medium text-slate-500 dark:text-slate-400" style={styles.userSubtitle}>
                Good Morning, ☀️
              </Text>
              <Text className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight" style={styles.userName}>
                {user?.name || 'Friend'}
              </Text>
              <Text className="text-xs text-slate-400" style={styles.userStatus}>Stay healthy, stay strong!</Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-2.5">
            <TouchableOpacity onPress={() => router.push('/(tabs)/meds')} activeOpacity={0.8}>
              <Image
                source={require('@/../assets/images/icon-symbol.png')}
                style={{ width: 38, height: 38, borderRadius: 10 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-11 h-11 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800 relative"
              style={styles.bellBtn}
              activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={21} color="#64748B" />
              <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500" style={styles.bellDot} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isMedsFetching}
            onRefresh={() => {
              refetchMeds();
            }}
            tintColor="#208AEF"
            colors={['#208AEF']}
          />
        }>
        {/* Today's Progress Card */}
        <View className="flex-row items-center p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 my-3 gap-4" style={styles.progressCard}>
          <View className="items-center justify-center">
            <View className="w-20 h-20 rounded-full border-4 border-emerald-500 items-center justify-center bg-emerald-50 dark:bg-emerald-950/40" style={styles.progressCircle}>
              <Text className="text-lg font-extrabold text-slate-900 dark:text-white" style={styles.progressNum}>
                {takenCount}/{totalCount}
              </Text>
              <Text className="text-[10px] font-medium text-slate-500" style={styles.progressSub}>doses taken</Text>
            </View>
          </View>

          <View className="flex-1 justify-center" style={{ flex: 1 }}>
            <Text className="text-base font-bold text-slate-900 dark:text-white mb-0.5" style={styles.progressTitle}>
              {"Today's Progress"}
            </Text>
            <Text className="text-sm font-bold text-emerald-600 mb-0.5" style={styles.progressPercent}>
              {progressPercent}% Complete
            </Text>
            <Text className="text-xs text-slate-500 leading-4" style={styles.progressEncourage}>
              {takenCount === totalCount
                ? 'All medications taken! Great job!'
                : `${totalCount - takenCount} doses remaining today.`}
            </Text>
          </View>
        </View>

        {/* Today's Schedule Header */}
        <View className="flex-row justify-between items-center mt-4 mb-3" style={styles.sectionHeader}>
          <Text className="text-lg font-bold text-slate-900 dark:text-white" style={styles.sectionTitle}>
            {"Today's Schedule"}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/meds')} activeOpacity={0.7}>
            <Text className="text-sm font-semibold text-primary" style={{ color: '#208AEF', fontWeight: '600' }}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Dose List */}
        <View className="gap-3" style={styles.doseList}>
          {doses.map((item, idx) => {
            const isTaken = item.status === 'taken';
            const slotInfo = getSlotDetails(item.timeSlot);
            const countdown = getCountdownInfo(item.time, currentTime);

            return (
              <View
                key={`${item.id}_${idx}`}
                className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                  isTaken
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-slate-800/90'
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm'
                }`}
                style={[
                  styles.doseCard,
                  isTaken ? styles.doseCardTaken : styles.doseCardPending,
                ]}>
                {/* Left Slot Indicator & Details */}
                <View className="flex-row items-center gap-3.5 flex-1" style={styles.doseLeft}>
                  {item.imageUri ? (
                    <View style={styles.dosePhotoContainer}>
                      <Image source={{ uri: item.imageUri }} style={styles.dosePhoto} resizeMode="cover" />
                      <View style={[styles.dosePhotoBadge, { backgroundColor: slotInfo.bg }]}>
                        <Ionicons name={slotInfo.icon} size={10} color={slotInfo.color} />
                      </View>
                    </View>
                  ) : (
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={[styles.slotBadge, { backgroundColor: slotInfo.bg }]}>
                      <Ionicons name={slotInfo.icon} size={18} color={slotInfo.color} />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text className="text-xs font-medium text-slate-400" style={styles.doseTime}>
                        {item.timeSlot} ({item.time})
                      </Text>
                      {!isTaken && (
                        <TouchableOpacity
                          onPress={() => countdown.isDue && handleTestDoseAlarm(item)}
                          disabled={!countdown.isDue}
                          activeOpacity={0.75}
                          style={[
                            styles.doseCountdownTag,
                            countdown.isDue
                              ? styles.doseCountdownTagDue
                              : countdown.isUrgent
                              ? styles.doseCountdownTagUrgent
                              : styles.doseCountdownTagNormal,
                          ]}>
                          <Ionicons
                            name={countdown.isDue ? 'alert-circle' : 'time'}
                            size={10}
                            color={countdown.isDue ? '#DC2626' : countdown.isUrgent ? '#D97706' : '#208AEF'}
                          />
                          <Text
                            style={[
                              styles.doseCountdownText,
                              countdown.isDue
                                ? styles.doseCountdownTextDue
                                : countdown.isUrgent
                                ? styles.doseCountdownTextUrgent
                                : styles.doseCountdownTextNormal,
                            ]}>
                            {countdown.text}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text className="text-base font-bold text-slate-900 dark:text-white" style={styles.doseMedName}>
                      {item.medicationName}{' '}
                      <Text className="text-sm font-normal text-slate-500" style={styles.doseMedDosage}>{item.dosage}</Text>
                    </Text>
                  </View>
                </View>

                {/* Right Action Button */}
                <TouchableOpacity
                  className={`px-4 py-2 rounded-full min-w-[80px] items-center justify-center flex-row gap-1 ${
                    isTaken
                      ? 'bg-emerald-100 dark:bg-emerald-950/60'
                      : item.isOutOfStock
                      ? 'bg-rose-100 dark:bg-rose-950/60'
                      : 'bg-primary'
                  }`}
                  style={[
                    styles.actionBtn,
                    isTaken
                      ? styles.actionBtnTaken
                      : item.isOutOfStock
                      ? { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', borderWidth: 1 }
                      : styles.actionBtnPending,
                  ]}
                  onPress={() => (item.isOutOfStock ? router.push('/(tabs)/meds') : toggleDose(item.id))}
                  activeOpacity={0.8}>
                  {isTaken ? (
                    <>
                      <Ionicons name="checkmark-circle" size={15} color="#059669" />
                      <Text className="text-emerald-700 dark:text-emerald-300 text-xs font-bold" style={styles.actionBtnTakenText}>
                        Taken
                      </Text>
                    </>
                  ) : item.isOutOfStock ? (
                    <>
                      <Ionicons name="alert-circle" size={14} color="#DC2626" />
                      <Text className="text-rose-700 text-xs font-bold">Refill</Text>
                    </>
                  ) : (
                    <Text className="text-white text-xs font-bold" style={styles.actionBtnPendingText}>Take</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Back to Onboarding Link */}
        {/* <TouchableOpacity
          className="flex-row items-center justify-center gap-2 py-3 mt-6 rounded-xl border border-slate-200 dark:border-slate-700"
          style={styles.returnBtn}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={16} color="#208AEF" />
          <Text className="text-sm font-semibold text-primary" style={{ color: '#208AEF', fontWeight: '600' }}>
            Back to Welcome & Onboarding
          </Text>
        </TouchableOpacity> */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#208AEF',
  },
  userSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  userStatus: {
    fontSize: 11,
    color: '#94A3B8',
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginVertical: 12,
    gap: 16,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#10B981',
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNum: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  progressEncourage: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  doseList: {
    gap: 12,
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  doseCardTaken: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  doseCardPending: {
    borderColor: '#E2E8F0',
  },
  doseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dosePhotoContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dosePhoto: {
    width: '100%',
    height: '100%',
  },
  dosePhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  doseCountdownTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  doseCountdownTagNormal: {
    backgroundColor: '#EFF6FF',
  },
  doseCountdownTagUrgent: {
    backgroundColor: '#FEF3C7',
  },
  doseCountdownTagDue: {
    backgroundColor: '#FEE2E2',
  },
  doseCountdownText: {
    fontSize: 10,
    fontWeight: '700',
  },
  doseCountdownTextNormal: {
    color: '#208AEF',
  },
  doseCountdownTextUrgent: {
    color: '#D97706',
  },
  doseCountdownTextDue: {
    color: '#DC2626',
  },
  doseMedName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  doseMedDosage: {
    fontSize: 13,
    fontWeight: '400',
    color: '#64748B',
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTaken: {
    backgroundColor: '#DCFCE7',
    flexDirection: 'row',
    gap: 4,
  },
  actionBtnTakenText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnPending: {
    backgroundColor: '#208AEF',
  },
  actionBtnPendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
