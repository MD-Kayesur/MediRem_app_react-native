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
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useGetMeQuery, useUpdateMeMutation, logout } from '@/redux';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const authStateUser = useAppSelector((state) => state.auth.user);
  const activeUserId = authStateUser?.id;

  // 1. Fetch exact user profile directly from Neon Cloud PostgreSQL backend
  const {
    data: profileResponse,
    isFetching: isProfileFetching,
    refetch,
  } = useGetMeQuery(activeUserId, {
    refetchOnMountOrArgChange: true,
  });

  const [updateMe, { isLoading: isUpdatingProfile }] = useUpdateMeMutation();

  const userProfile = profileResponse?.data;
  const displayName = userProfile?.name || authStateUser?.name || 'MediRem User';
  const displayEmail = userProfile?.email || authStateUser?.email || 'user@medirem.app';
  const displayPhone = userProfile?.phone || authStateUser?.phone || null;
  const role = userProfile?.role || 'USER';
  const isAdmin = role === 'ADMIN';
  const isVerified = userProfile?.isVerified ?? true;
  const medicationsCount = userProfile?.medicationsCount ?? 0;

  // Settings State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Edit Profile Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  const openEditModal = () => {
    setEditName(displayName);
    setEditPhone(displayPhone || '');
    setEditErrorMessage(null);
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    setEditErrorMessage(null);
    if (!editName.trim()) {
      setEditErrorMessage('Name cannot be empty.');
      return;
    }

    try {
      await updateMe({
        userId: activeUserId,
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
      }).unwrap();

      setIsEditModalVisible(false);
      Alert.alert('Profile Updated! 🎉', 'Your personal details were saved to your Neon Cloud database.');
    } catch (err: any) {
      setEditErrorMessage(
        err?.data?.message || err?.error || 'Failed to update profile. Please try again.'
      );
    }
  };

  const handleLogOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of MediRem?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          dispatch(logout());
          router.replace('/sign-in');
        },
      },
    ]);
  };

  const formatJoinedDate = (dateStr?: string) => {
    if (!dateStr) return 'Joined recently';
    try {
      const d = new Date(dateStr);
      return `Member since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Member since 2026';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900" style={styles.container}>
      {/* Header Bar */}
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between" style={styles.header}>
        <Text className="text-2xl font-black text-slate-900 dark:text-white" style={styles.headerTitle}>
          Profile
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={styles.refreshIconBtn}
          activeOpacity={0.7}
          accessibilityLabel="Refresh profile">
          <Ionicons
            name="refresh"
            size={20}
            color={isProfileFetching ? '#208AEF' : '#64748B'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isProfileFetching}
            onRefresh={() => {
              refetch();
            }}
            tintColor="#208AEF"
            colors={['#208AEF']}
          />
        }>
        {/* User Profile Card from Neon DB */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Ionicons
              name={isAdmin ? 'shield-checkmark' : 'person'}
              size={28}
              color={isAdmin ? '#D97706' : '#208AEF'}
            />
          </View>

          <View style={styles.userInfoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>

              {/* Role Badge */}
              <View
                style={[
                  styles.roleBadge,
                  isAdmin ? styles.adminBadge : styles.memberBadge,
                ]}>
                <Ionicons
                  name={isAdmin ? 'key' : 'shield-checkmark'}
                  size={11}
                  color={isAdmin ? '#B45309' : '#0284C7'}
                  style={{ marginRight: 3 }}
                />
                <Text
                  style={[
                    styles.roleBadgeText,
                    isAdmin ? styles.adminBadgeText : styles.memberBadgeText,
                  ]}>
                  {role}
                </Text>
              </View>
            </View>

            <Text style={styles.userEmail} numberOfLines={1}>
              {displayEmail}
            </Text>

            {displayPhone && (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={12} color="#64748B" />
                <Text style={styles.phoneText}>{displayPhone}</Text>
              </View>
            )}

            {/* Live Neon DB Synchronization Status */}
            <View style={styles.syncStatusRow}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>Cloud Synchronized (Neon DB)</Text>
              {isVerified && (
                <View style={styles.verifiedChip}>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                  <Text style={styles.verifiedChipText}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={openEditModal}
            style={styles.editBtn}
            activeOpacity={0.75}
            accessibilityLabel="Edit profile details">
            <Ionicons name="pencil" size={16} color="#208AEF" />
          </TouchableOpacity>
        </View>

        {/* Database Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{medicationsCount}</Text>
            <Text style={styles.statLabel}>Active Meds</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Adherence</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>Active</Text>
            <Text style={styles.statLabel}>Loud Alarm</Text>
          </View>
        </View>

        {/* Section: Account & Personal Information */}
        <Text style={styles.sectionHeader}>Account Details</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={openEditModal}
            activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name="person-outline" size={18} color="#208AEF" />
              </View>
              <View>
                <Text style={styles.menuText}>Personal Information</Text>
                <Text style={styles.menuSubText}>{displayName} • {displayPhone || 'Add phone'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Security Info', `Account ID: ${userProfile?.id || 'Local'}\n${formatJoinedDate(userProfile?.createdAt)}`)}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.menuText}>Security & Database Sync</Text>
                <Text style={styles.menuSubText}>{formatJoinedDate(userProfile?.createdAt)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section: Caregiver Sharing */}
        <Text style={styles.sectionHeader}>Caregiver Sharing</Text>
        <View style={styles.caregiverCard}>
          <View style={styles.caregiverHeader}>
            <View style={styles.caregiverLeft}>
              <View style={styles.caregiverAvatar}>
                <Ionicons name="people" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.caregiverName}>Ayesha Rahman</Text>
                <Text style={styles.caregiverPhone}>+880 1712 345678</Text>
              </View>
            </View>
            <View style={styles.activeTag}>
              <Text style={styles.activeTagText}>Active</Text>
            </View>
          </View>
          <Text style={styles.caregiverDesc}>
            Can view medication schedule and receive missed dose alerts with your consent.
          </Text>
        </View>

        {/* Section: App Settings */}
        <Text style={styles.sectionHeader}>App Settings</Text>
        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name="notifications-outline" size={18} color="#208AEF" />
              </View>
              <Text style={styles.menuText}>Loud Alarm Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={notificationsEnabled ? '#208AEF' : '#F1F5F9'}
            />
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/meds')}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="pill" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.menuText}>Manage Medications ({medicationsCount})</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* MediRem App Branding Card */}
        <View style={styles.brandingCard}>
          <Image
            source={require('@/../assets/images/medirem-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandSub}>Version 1.0.0 • Connected to Neon Cloud PostgreSQL</Text>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          onPress={handleLogOut}
          style={styles.logoutBtn}
          activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile ✏️</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Update your personal details stored in your MediRem Neon database.
            </Text>

            {editErrorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{editErrorMessage}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone / Emergency Contact</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="e.g. +1 555 123 4567"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditModalVisible(false)}
                disabled={isUpdatingProfile}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isUpdatingProfile && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={isUpdatingProfile}>
                {isUpdatingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0284C7',
    marginRight: 14,
  },
  userInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  memberBadge: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adminBadgeText: {
    color: '#B45309',
  },
  memberBadgeText: {
    color: '#0369A1',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  syncText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedChipText: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: '700',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0284C7',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  caregiverCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  caregiverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  caregiverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  caregiverPhone: {
    fontSize: 12,
    color: '#64748B',
  },
  activeTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  caregiverDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  brandingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  brandLogo: {
    width: 140,
    height: 50,
    marginBottom: 6,
  },
  brandSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#208AEF',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
