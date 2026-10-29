import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of MediRem?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => router.replace('/'),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900" style={styles.container}>
      {/* Header */}
      <View className="px-5 pt-3 pb-2" style={styles.header}>
        <Text className="text-2xl font-black text-slate-900 dark:text-white" style={styles.headerTitle}>
          Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View className="flex-row items-center p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 mb-5 shadow-sm" style={styles.userCard}>
          <View className="w-14 h-14 rounded-full bg-blue-100 dark:bg-slate-700 items-center justify-center border-2 border-primary mr-3.5" style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color="#208AEF" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-extrabold text-slate-900 dark:text-white" style={styles.userName}>
                Rahman
              </Text>
              <View className="bg-blue-100 dark:bg-sky-950 px-2 py-0.5 rounded-md" style={styles.patientBadge}>
                <Text className="text-[10px] font-bold text-primary" style={{ color: '#208AEF' }}>Patient</Text>
              </View>
            </View>
            <Text className="text-xs text-slate-500 mt-0.5" style={styles.userEmail}>rahman@example.com</Text>
            <Text className="text-[11px] text-emerald-600 font-semibold mt-0.5" style={{ color: '#10B981' }}>
              ● Synchronized Locally
            </Text>
          </View>
        </View>

        {/* Section: Health & Personal */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1" style={styles.sectionHeader}>
          Account Details
        </Text>
        <View className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 mb-5 overflow-hidden shadow-sm" style={styles.menuGroup}>
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800" style={styles.menuItem} activeOpacity={0.7}>
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-700 items-center justify-center" style={styles.menuIcon}>
                <Ionicons name="person-outline" size={18} color="#208AEF" />
              </View>
              <Text className="text-sm font-semibold text-slate-800 dark:text-white" style={styles.menuText}>Personal Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800" style={styles.menuItem} activeOpacity={0.7}>
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-slate-700 items-center justify-center" style={[styles.menuIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="heart-outline" size={18} color="#10B981" />
              </View>
              <Text className="text-sm font-semibold text-slate-800 dark:text-white" style={styles.menuText}>Health Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-4" style={styles.menuItem} activeOpacity={0.7}>
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-slate-700 items-center justify-center" style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="hardware-chip-outline" size={18} color="#F59E0B" />
              </View>
              <Text className="text-sm font-semibold text-slate-800 dark:text-white" style={styles.menuText}>Connected Devices</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section: Family & Caregiver (From mockup screen 14) */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1" style={styles.sectionHeader}>
          Caregiver Sharing
        </Text>
        <View className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 mb-5 shadow-sm" style={styles.caregiverCard}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 items-center justify-center" style={styles.caregiverAvatar}>
                <Ionicons name="people" size={20} color="#10B981" />
              </View>
              <View>
                <Text className="text-sm font-bold text-slate-900 dark:text-white" style={styles.caregiverName}>Ayesha Rahman</Text>
                <Text className="text-xs text-slate-400">+880 1712 345678</Text>
              </View>
            </View>
            <View className="bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Active</Text>
            </View>
          </View>
          <Text className="text-xs text-slate-500 mt-1 leading-4" style={styles.caregiverDesc}>
            Can view medication schedule and receive missed dose alerts with your consent.
          </Text>
        </View>

        {/* Section: App Settings */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1" style={styles.sectionHeader}>
          App Settings
        </Text>
        <View className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 mb-6 overflow-hidden shadow-sm" style={styles.menuGroup}>
          <View className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800" style={styles.menuItem}>
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-700 items-center justify-center" style={styles.menuIcon}>
                <Ionicons name="notifications-outline" size={18} color="#208AEF" />
              </View>
              <Text className="text-sm font-semibold text-slate-800 dark:text-white" style={styles.menuText}>App Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={notificationsEnabled ? '#208AEF' : '#F1F5F9'}
            />
          </View>

          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800" style={styles.menuItem} activeOpacity={0.7}>
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-700 items-center justify-center" style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="globe-outline" size={18} color="#6366F1" />
              </View>
              <Text className="text-sm font-semibold text-slate-800 dark:text-white" style={styles.menuText}>Language</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs text-slate-400 font-medium">English</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-4" style={styles.menuItem} activeOpacity={0.7}>
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 items-center justify-center" style={styles.menuIcon}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#64748B" />
              </View>
              <Text className="text-sm font-semibold text-slate-800 dark:text-white" style={styles.menuText}>Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* MediRem App Branding Card */}
        <View className="items-center justify-center py-5 px-4 mb-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <Image
            source={require('@/../assets/images/medirem-logo.png')}
            style={{ width: 140, height: 140, marginBottom: 2 }}
            resizeMode="contain"
          />
          <Text className="text-xs text-slate-400 mt-1">Version 1.0.0 • Your Daily Health Companion</Text>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          onPress={handleLogOut}
          className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 mb-8"
          style={styles.logoutBtn}
          activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text className="text-sm font-bold text-rose-600 dark:text-rose-400" style={styles.logoutText}>
            Log Out
          </Text>
        </TouchableOpacity>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#208AEF',
    marginRight: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  patientBadge: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  caregiverCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  caregiverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caregiverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  caregiverDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 32,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
});
