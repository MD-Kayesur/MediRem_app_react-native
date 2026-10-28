import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarPickerProps {
  visible: boolean;
  initialDate?: Date;
  title?: string;
  onClose: () => void;
  onSelectDate: (date: Date, formattedDate: string) => void;
}

interface TimePickerProps {
  visible: boolean;
  initialTime?: string; // e.g. "08:00 AM"
  onClose: () => void;
  onSelectTime: (formattedTime: string, timeSlot: 'Morning' | 'Afternoon' | 'Evening' | 'Night') => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const QUICK_TIME_SLOTS = [
  { label: 'Morning', time: '08:00 AM', slot: 'Morning' as const, icon: 'sunny' as const, color: '#10B981' },
  { label: 'Afternoon', time: '01:00 PM', slot: 'Afternoon' as const, icon: 'partly-sunny' as const, color: '#208AEF' },
  { label: 'Evening', time: '07:00 PM', slot: 'Evening' as const, icon: 'cloudy-night' as const, color: '#F59E0B' },
  { label: 'Night', time: '10:00 PM', slot: 'Night' as const, icon: 'moon' as const, color: '#6366F1' },
];

/**
 * Interactive Calendar Modal to select Date
 */
export function CalendarPickerModal({
  visible,
  initialDate = new Date(),
  title = 'Select Date',
  onClose,
  onSelectDate,
}: CalendarPickerProps) {
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [prevInitialDate, setPrevInitialDate] = useState(initialDate);

  if (initialDate !== prevInitialDate) {
    setPrevInitialDate(initialDate);
    setCurrentYear(initialDate.getFullYear());
    setCurrentMonth(initialDate.getMonth());
    setSelectedDay(initialDate.getDate());
  }

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
  };

  const handleConfirm = () => {
    const picked = new Date(currentYear, currentMonth, selectedDay);
    const formatted = `${MONTH_NAMES[currentMonth].substring(0, 3)} ${selectedDay}, ${currentYear}`;
    onSelectDate(picked, formatted);
    onClose();
  };

  const handleQuickPreset = (daysFromToday: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromToday);
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
    setSelectedDay(target.getDate());
  };

  // Generate calendar grid cells
  const gridCells = [];
  // Empty leading cells
  for (let i = 0; i < firstDayIndex; i++) {
    gridCells.push(null);
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    gridCells.push(day);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBox}>
                <Ionicons name="calendar" size={18} color="#208AEF" />
              </View>
              <Text style={styles.modalHeaderTitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Shortcuts */}
          <View style={styles.shortcutRow}>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => handleQuickPreset(0)}>
              <Text style={styles.shortcutText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => handleQuickPreset(1)}>
              <Text style={styles.shortcutText}>Tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => handleQuickPreset(7)}>
              <Text style={styles.shortcutText}>In 1 Week</Text>
            </TouchableOpacity>
          </View>

          {/* Month & Year Navigator */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
              <Ionicons name="chevron-forward" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd, index) => (
              <Text key={index} style={styles.weekdayText}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Calendar Day Grid */}
          <View style={styles.daysGrid}>
            {gridCells.map((day, idx) => {
              if (day === null) {
                return <View key={idx} style={styles.dayCell} />;
              }
              const isSelected = day === selectedDay;
              const isToday = isCurrentMonth && day === today.getDate();

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelectDay(day)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}>
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>Set Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Interactive Time Picker Modal to select Time & Slot
 */
export function TimePickerModal({
  visible,
  initialTime = '08:00 AM',
  onClose,
  onSelectTime,
}: TimePickerProps) {
  // Parse initial time string if present
  const parseTime = (str: string) => {
    const parts = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (parts) {
      return {
        h: parseInt(parts[1], 10),
        m: parts[2].padStart(2, '0'),
        period: (parts[3].toUpperCase() === 'PM' ? 'PM' : 'AM') as 'AM' | 'PM',
      };
    }
    return { h: 8, m: '00', period: 'AM' as const };
  };

  const parsed = parseTime(initialTime);
  const [selectedHour, setSelectedHour] = useState(parsed.h);
  const [selectedMinute, setSelectedMinute] = useState(parsed.m);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);
  const [prevInitialTime, setPrevInitialTime] = useState(initialTime);

  if (initialTime !== prevInitialTime) {
    setPrevInitialTime(initialTime);
    const p = parseTime(initialTime);
    setSelectedHour(p.h);
    setSelectedMinute(p.m);
    setPeriod(p.period);
  }

  const calculateSlot = (hour: number, ampm: 'AM' | 'PM'): 'Morning' | 'Afternoon' | 'Evening' | 'Night' => {
    const h24 = ampm === 'PM' ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    if (h24 >= 5 && h24 < 12) return 'Morning';
    if (h24 >= 12 && h24 < 17) return 'Afternoon';
    if (h24 >= 17 && h24 < 21) return 'Evening';
    return 'Night';
  };

  const handleConfirm = () => {
    const formatted = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute} ${period}`;
    const slot = calculateSlot(selectedHour, period);
    onSelectTime(formatted, slot);
    onClose();
  };

  const handleSelectQuickSlot = (quick: typeof QUICK_TIME_SLOTS[0]) => {
    const p = parseTime(quick.time);
    setSelectedHour(p.h);
    setSelectedMinute(p.m);
    setPeriod(p.period);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBox, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="time" size={18} color="#208AEF" />
              </View>
              <Text style={styles.modalHeaderTitle}>Select Reminder Time</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Slot Buttons */}
          <View style={styles.quickSlotRow}>
            {QUICK_TIME_SLOTS.map((slotItem) => (
              <TouchableOpacity
                key={slotItem.label}
                onPress={() => handleSelectQuickSlot(slotItem)}
                style={styles.quickSlotBtn}>
                <Ionicons name={slotItem.icon} size={15} color={slotItem.color} />
                <Text style={styles.quickSlotText}>{slotItem.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Digital Time Preview */}
          <View style={styles.digitalClockBox}>
            <View style={styles.digitalTimeDisplay}>
              <Text style={styles.clockDigitText}>
                {selectedHour.toString().padStart(2, '0')} : {selectedMinute}
              </Text>
            </View>

            {/* AM / PM Toggle */}
            <View style={styles.periodToggleBox}>
              <TouchableOpacity
                onPress={() => setPeriod('AM')}
                style={[
                  styles.periodBtn,
                  period === 'AM' && styles.periodBtnActive,
                ]}>
                <Text
                  style={[
                    styles.periodText,
                    period === 'AM' && styles.periodTextActive,
                  ]}>
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPeriod('PM')}
                style={[
                  styles.periodBtn,
                  period === 'PM' && styles.periodBtnActive,
                ]}>
                <Text
                  style={[
                    styles.periodText,
                    period === 'PM' && styles.periodTextActive,
                  ]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hours Selector */}
          <Text style={styles.pickerSectionLabel}>Hour</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollChipsContainer}>
            {HOURS.map((h) => {
              const isSelected = selectedHour === h;
              return (
                <TouchableOpacity
                  key={h}
                  onPress={() => setSelectedHour(h)}
                  style={[
                    styles.chipBtn,
                    isSelected && styles.chipBtnSelected,
                  ]}>
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Minutes Selector */}
          <Text style={styles.pickerSectionLabel}>Minute</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollChipsContainer}>
            {MINUTES.map((m) => {
              const isSelected = selectedMinute === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setSelectedMinute(m)}
                  style={[
                    styles.chipBtn,
                    isSelected && styles.chipBtnSelected,
                  ]}>
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}>
                    :{m}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  shortcutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginBottom: 12,
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: '#208AEF',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#208AEF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayTextToday: {
    color: '#208AEF',
    fontWeight: '800',
  },
  quickSlotRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  quickSlotBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickSlotText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  digitalClockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F7FF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  digitalTimeDisplay: {
    flex: 1,
  },
  clockDigitText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#208AEF',
    letterSpacing: 1,
  },
  periodToggleBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  periodBtnActive: {
    backgroundColor: '#208AEF',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  pickerSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  scrollChipsContainer: {
    gap: 8,
    paddingVertical: 4,
    marginBottom: 14,
  },
  chipBtn: {
    minWidth: 44,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBtnSelected: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

