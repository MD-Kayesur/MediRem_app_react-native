import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CalendarPickerModal } from '@/components/date-time-picker-modal';
import { useGetDoseHistoryQuery } from '@/redux';

interface HistoryLog {
  id: string;
  medicationName: string;
  dosage: string;
  time: string;
  status: 'taken' | 'skipped' | 'pending';
}

const INITIAL_LOGS: HistoryLog[] = [
  {
    id: '1',
    medicationName: 'Paracetamol',
    dosage: '500mg',
    time: '8:12 AM',
    status: 'taken',
  },
  {
    id: '2',
    medicationName: 'Vitamin D3',
    dosage: '1000IU',
    time: '1:05 PM',
    status: 'taken',
  },
  {
    id: '3',
    medicationName: 'Metformin',
    dosage: '500mg',
    time: '7:00 PM',
    status: 'skipped',
  },
  {
    id: '4',
    medicationName: 'Atorvastatin',
    dosage: '10mg',
    time: '10:00 PM',
    status: 'pending',
  },
];

export default function HistoryScreen() {
  const { data: dbLogs = [], isFetching, refetch } = useGetDoseHistoryQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  // Dynamically derive logs directly from Neon Cloud PostgreSQL
  const logs: HistoryLog[] = useMemo(() => {
    if (dbLogs && dbLogs.length > 0) {
      return dbLogs.map((item: any) => ({
        id: item.id,
        medicationName: item.medication?.name || 'Medication',
        dosage: item.medication?.dosage || '1 dose',
        time: item.scheduledTime || (item.takenAt ? new Date(item.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00 AM'),
        status: (item.status as any) || 'taken',
      }));
    }
    return INITIAL_LOGS;
  }, [dbLogs]);

  const [filter, setFilter] = useState<'all' | 'taken' | 'skipped' | 'pending'>('all');
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [customDate, setCustomDate] = useState<string | null>(null);

  const dates = useMemo(() => {
    const list: string[] = [];
    if (customDate) list.push(customDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      if (!list.includes(str)) list.push(str);
    }
    return list;
  }, [customDate]);

  const filteredLogs = logs.filter((log) => filter === 'all' || log.status === filter);

  const handlePrevDay = () => {
    if (currentDateIndex < dates.length - 1) {
      setCurrentDateIndex(currentDateIndex + 1);
    }
  };

  const handleNextDay = () => {
    if (currentDateIndex > 0) {
      setCurrentDateIndex(currentDateIndex - 1);
    }
  };

  const renderStatusBadge = (status: HistoryLog['status']) => {
    switch (status) {
      case 'taken':
        return (
          <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center" style={styles.statusTaken}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        );
      case 'skipped':
        return (
          <View className="w-8 h-8 rounded-full bg-rose-100 items-center justify-center" style={styles.statusSkipped}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </View>
        );
      case 'pending':
        return (
          <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center" style={styles.statusPending}>
            <Ionicons name="ellipse-outline" size={20} color="#94A3B8" />
          </View>
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900" style={styles.container}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2" style={styles.header}>
        <View className="flex-row items-center gap-2 mb-3" style={styles.titleRow}>
          <View className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-slate-800 items-center justify-center" style={styles.calendarIconBox}>
            <Ionicons name="calendar" size={20} color="#208AEF" />
          </View>
          <Text className="text-2xl font-black text-slate-900 dark:text-white" style={styles.title}>
            Dose History
          </Text>
        </View>

        {/* Date Switcher Bar */}
        <View className="flex-row justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-2.5 mb-3 border border-slate-100 dark:border-slate-700" style={styles.dateBar}>
          <TouchableOpacity
            onPress={handlePrevDay}
            className="p-1 rounded-full"
            activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsCalendarOpen(true)}
            className="flex-row items-center gap-1.5"
            activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={15} color="#208AEF" />
            <Text className="text-sm font-bold text-slate-800 dark:text-white" style={styles.dateText}>
              {dates[currentDateIndex]}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNextDay}
            className="p-1 rounded-full"
            disabled={currentDateIndex === 0}
            style={{ opacity: currentDateIndex === 0 ? 0.3 : 1 }}
            activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View className="flex-row gap-2" style={styles.filterRow}>
          {(['all', 'taken', 'skipped', 'pending'] as const).map((tab) => {
            const isActive = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                className={`px-3 py-1 rounded-full border ${
                  isActive
                    ? 'bg-blue-50 border-primary dark:bg-slate-800'
                    : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                }`}
                style={[
                  styles.filterChip,
                  isActive ? styles.filterChipActive : styles.filterChipInactive,
                ]}
                onPress={() => setFilter(tab)}>
                <Text
                  className={`text-xs font-semibold capitalize ${
                    isActive ? 'text-primary' : 'text-slate-500'
                  }`}
                  style={{ color: isActive ? '#208AEF' : '#64748B' }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* History Log List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => {
              refetch();
            }}
            tintColor="#208AEF"
            colors={['#208AEF']}
          />
        }>
        <View className="gap-3" style={styles.logList}>
          {filteredLogs.map((log) => (
            <View
              key={log.id}
              className="flex-row items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm"
              style={styles.logCard}>
              <View className="flex-row items-center gap-3.5 flex-1" style={styles.logLeft}>
                {renderStatusBadge(log.status)}
                <View>
                  <Text className="text-base font-bold text-slate-900 dark:text-white" style={styles.logMedName}>
                    {log.medicationName}{' '}
                    <Text className="text-sm font-normal text-slate-500" style={styles.logDosage}>{log.dosage}</Text>
                  </Text>
                  <Text className="text-xs text-slate-400 capitalize" style={styles.logMeta}>
                    {log.status} • {log.time}
                  </Text>
                </View>
              </View>

              <View
                className={`px-2.5 py-1 rounded-full ${
                  log.status === 'taken'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40'
                    : log.status === 'skipped'
                    ? 'bg-rose-50 dark:bg-rose-950/40'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
                style={styles.pillBadge}>
                <Text
                  className={`text-[11px] font-bold capitalize ${
                    log.status === 'taken'
                      ? 'text-emerald-700'
                      : log.status === 'skipped'
                      ? 'text-rose-600'
                      : 'text-slate-500'
                  }`}
                  style={{
                    color:
                      log.status === 'taken'
                        ? '#059669'
                        : log.status === 'skipped'
                        ? '#EF4444'
                        : '#64748B',
                  }}>
                  {log.status}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Weekly Adherence Summary Card (from mockup) */}
        <View className="flex-row items-center justify-between p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 mt-6 shadow-sm" style={styles.summaryCard}>
          <View>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1" style={styles.summaryLabel}>
              This Week
            </Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white" style={styles.summaryRatio}>
              5/7
            </Text>
            <Text className="text-xs text-slate-500" style={styles.summarySub}>doses taken</Text>
          </View>

          {/* 71% Circular Ring */}
          <View className="w-20 h-20 rounded-full border-4 border-emerald-500 items-center justify-center bg-white dark:bg-slate-900 shadow-sm" style={styles.ringBox}>
            <Text className="text-lg font-black text-emerald-600" style={styles.ringText}>71%</Text>
          </View>
        </View>
      </ScrollView>

      {/* Calendar Picker Modal */}
      <CalendarPickerModal
        visible={isCalendarOpen}
        initialDate={selectedDate}
        onClose={() => setIsCalendarOpen(false)}
        onSelectDate={(date, formatted) => {
          setSelectedDate(date);
          setCustomDate(formatted);
          setCurrentDateIndex(0);
        }}
      />
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  calendarIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#E6F4FE',
    borderColor: '#208AEF',
  },
  filterChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  logList: {
    gap: 12,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusTaken: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSkipped: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPending: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logMedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  logDosage: {
    fontSize: 13,
    fontWeight: '400',
    color: '#64748B',
  },
  logMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginTop: 20,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  summaryRatio: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  summarySub: {
    fontSize: 12,
    color: '#64748B',
  },
  ringBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#10B981',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#10B981',
  },
});
