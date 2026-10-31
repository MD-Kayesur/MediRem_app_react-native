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
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/slices/authSlice';

interface HistoryLog {
  id: string;
  medicationName: string;
  dosage: string;
  time: string;
  status: 'taken' | 'skipped' | 'pending';
  rawDate: string;
  dateStr: string;
  displayDate: string;
  note?: string;
}

export default function HistoryScreen() {
  const user = useAppSelector(selectCurrentUser);
  const activeUserId = user?.id;

  const {
    data: dbLogs = [],
    isFetching,
    refetch,
  } = useGetDoseHistoryQuery(activeUserId, {
    refetchOnMountOrArgChange: true,
  });

  // Dynamically derive logs strictly scoped to active user from Neon Cloud PostgreSQL
  const logs: HistoryLog[] = useMemo(() => {
    if (dbLogs && dbLogs.length > 0) {
      return dbLogs
        .filter((item: any) => !activeUserId || item.medication?.userId === activeUserId)
        .map((item: any) => {
          const rawDate = item.takenAt || item.createdAt || new Date().toISOString();
          const dateObj = new Date(rawDate);
          const dateStr = dateObj.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
          const isToday = new Date().toDateString() === dateObj.toDateString();
          const timeStr =
            item.scheduledTime ||
            dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const displayDate = isToday
            ? `Today, ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : `${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${timeStr}`;

          return {
            id: item.id,
            medicationName: item.medication?.name || 'Medication',
            dosage: item.medication?.dosage || '1 dose',
            time: timeStr,
            status: (item.status as any) || 'taken',
            rawDate,
            dateStr,
            displayDate,
            note: item.note,
          };
        });
    }
    return []; // Never return mock logs or another user's logs
  }, [dbLogs, activeUserId]);

  const [filter, setFilter] = useState<'all' | 'taken' | 'skipped'>('all');
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [isAllDatesMode, setIsAllDatesMode] = useState(true);

  // Available dates (last 7 calendar days + any custom picked date)
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

  // Filter logs by status and optionally by selected date
  const filteredLogs = useMemo(() => {
    const selectedDateStr = dates[currentDateIndex];
    return logs.filter((log) => {
      const matchStatus = filter === 'all' || log.status === filter;
      if (!matchStatus) return false;
      if (isAllDatesMode) return true;
      return log.dateStr === selectedDateStr;
    });
  }, [logs, filter, isAllDatesMode, dates, currentDateIndex]);

  // Dynamic statistics calculated from live Neon DB logs
  const totalRecordedCount = logs.length;
  const takenCount = logs.filter((l) => l.status === 'taken').length;
  const skippedCount = logs.filter((l) => l.status === 'skipped').length;
  const adherenceRate = totalRecordedCount > 0 ? Math.round((takenCount / totalRecordedCount) * 100) : 100;

  const handlePrevDay = () => {
    setIsAllDatesMode(false);
    if (currentDateIndex < dates.length - 1) {
      setCurrentDateIndex(currentDateIndex + 1);
    }
  };

  const handleNextDay = () => {
    setIsAllDatesMode(false);
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
      default:
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
        <View className="flex-row items-center justify-between mb-3" style={styles.titleRow}>
          <View className="flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-slate-800 items-center justify-center" style={styles.calendarIconBox}>
              <Ionicons name="calendar" size={20} color="#208AEF" />
            </View>
            <View>
              <Text className="text-2xl font-black text-slate-900 dark:text-white" style={styles.title}>
                Dose History
              </Text>
              <Text className="text-xs text-slate-400">
                Live intake logs from Neon Cloud PostgreSQL
              </Text>
            </View>
          </View>

          {/* Quick Refresh Icon */}
          <TouchableOpacity
            onPress={() => refetch()}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
            activeOpacity={0.7}
            accessibilityLabel="Refresh history">
            <Ionicons name={isFetching ? 'sync' : 'refresh'} size={16} color="#208AEF" />
          </TouchableOpacity>
        </View>

        {/* Date Switcher Bar with All-Dates Mode */}
        <View className="flex-row justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-2xl px-3 py-2 mb-3 border border-slate-100 dark:border-slate-700" style={styles.dateBar}>
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
              {isAllDatesMode ? 'All History Records' : dates[currentDateIndex]}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNextDay}
            className="p-1 rounded-full"
            disabled={isAllDatesMode || currentDateIndex === 0}
            style={{ opacity: isAllDatesMode || currentDateIndex === 0 ? 0.3 : 1 }}
            activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Filter Chips Row */}
        <View className="flex-row gap-2" style={styles.filterRow}>
          <TouchableOpacity
            className={`px-3 py-1 rounded-full border ${
              isAllDatesMode
                ? 'bg-blue-50 border-primary dark:bg-slate-800'
                : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
            }`}
            style={[
              styles.filterChip,
              isAllDatesMode ? styles.filterChipActive : styles.filterChipInactive,
            ]}
            onPress={() => setIsAllDatesMode(!isAllDatesMode)}>
            <Text
              className="text-xs font-semibold"
              style={{ color: isAllDatesMode ? '#208AEF' : '#64748B' }}>
              {isAllDatesMode ? '✓ All Dates' : 'All Dates'}
            </Text>
          </TouchableOpacity>

          {(['all', 'taken', 'skipped'] as const).map((tab) => {
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
                  className="text-xs font-semibold capitalize"
                  style={{ color: isActive ? '#208AEF' : '#64748B' }}>
                  {tab === 'all' ? 'All Status' : tab}
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
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={42} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Dose Logs Found</Text>
            <Text style={styles.emptySub}>
              {isAllDatesMode
                ? 'No dose intake has been recorded yet. Take doses on the Today screen or during alarms to automatically log them in Neon Database!'
                : `No doses logged for ${dates[currentDateIndex]}. Tap "All Dates" above to see complete history.`}
            </Text>
          </View>
        ) : (
          <View className="gap-3" style={styles.logList}>
            {filteredLogs.map((log) => (
              <View
                key={log.id}
                className="flex-row items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm"
                style={styles.logCard}>
                <View className="flex-row items-center gap-3.5 flex-1" style={styles.logLeft}>
                  {renderStatusBadge(log.status)}
                  <View style={{ flex: 1 }}>
                    <Text className="text-base font-bold text-slate-900 dark:text-white" style={styles.logMedName}>
                      {log.medicationName}{' '}
                      <Text className="text-sm font-normal text-slate-500" style={styles.logDosage}>({log.dosage})</Text>
                    </Text>
                    <Text className="text-xs text-slate-400 capitalize" style={styles.logMeta}>
                      {log.status === 'taken' ? '✓ Taken' : log.status} • {log.displayDate}
                    </Text>
                  </View>
                </View>

                <View
                  className={`px-2.5 py-1 rounded-full ${
                    log.status === 'taken'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40'
                      : 'bg-rose-50 dark:bg-rose-950/40'
                  }`}
                  style={styles.pillBadge}>
                  <Text
                    className={`text-[11px] font-bold capitalize ${
                      log.status === 'taken' ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                    style={{
                      color: log.status === 'taken' ? '#059669' : '#EF4444',
                    }}>
                    {log.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Live Adherence Summary Card dynamically calculated from database */}
        <View className="flex-row items-center justify-between p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 mt-6 shadow-sm" style={styles.summaryCard}>
          <View>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1" style={styles.summaryLabel}>
              Overall Adherence
            </Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white" style={styles.summaryRatio}>
              {takenCount} / {totalRecordedCount}
            </Text>
            <Text className="text-xs text-slate-500" style={styles.summarySub}>
              {skippedCount > 0 ? `${skippedCount} skipped • ` : ''}doses taken on schedule
            </Text>
          </View>

          {/* Dynamic Circular Ring Percentage */}
          <View className="w-20 h-20 rounded-full border-4 border-emerald-500 items-center justify-center bg-white dark:bg-slate-900 shadow-sm" style={styles.ringBox}>
            <Text className="text-lg font-black text-emerald-600" style={styles.ringText}>
              {adherenceRate}%
            </Text>
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
          setIsAllDatesMode(false);
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
    flexWrap: 'wrap',
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
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logMedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  logDosage: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  logMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusTaken: {
    backgroundColor: '#DCFCE7',
  },
  statusSkipped: {
    backgroundColor: '#FEE2E2',
  },
  statusPending: {
    backgroundColor: '#F1F5F9',
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginTop: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryRatio: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  summarySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  ringBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  ringText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#10B981',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
