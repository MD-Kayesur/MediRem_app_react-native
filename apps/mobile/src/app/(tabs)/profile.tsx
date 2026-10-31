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
import {
  useGetMeQuery,
  useUpdateMeMutation,
  useGetAllUsersQuery,
  logout,
  setActiveRingtone,
  addCustomRingtone,
  updateCustomRingtone,
  deleteCustomRingtone,
  setVibrationEnabled,
  RingtoneItem,
} from '@/redux';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import {
  previewRingtoneSound,
  stopRingtonePreview,
  setActiveSoundUrl,
} from '@/utils/alarm';

const TONE_PRESETS = [
  {
    id: 'preset-beeper',
    name: 'Clinical Digital Beep',
    subtitle: 'Clear electronic alarm pulses',
    url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    category: 'beeper' as const,
    icon: 'notifications',
    color: '#208AEF',
  },
  {
    id: 'preset-chime',
    name: 'Morning Sunrise Chime',
    subtitle: 'Gentle harmonic chime bells',
    url: 'https://actions.google.com/sounds/v1/household/doorbell_chime.ogg',
    category: 'chime' as const,
    icon: 'sunny',
    color: '#10B981',
  },
  {
    id: 'preset-bell',
    name: 'Cathedral Bell Toll',
    subtitle: 'Deep resonance metallic ring',
    url: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg',
    category: 'bell' as const,
    icon: 'notifications-circle',
    color: '#8B5CF6',
  },
  {
    id: 'preset-radar',
    name: 'Urgent Radar Siren',
    subtitle: 'Pulsed siren alert for critical meds',
    url: 'https://actions.google.com/sounds/v1/emergency/siren_short.ogg',
    category: 'radar' as const,
    icon: 'warning',
    color: '#EF4444',
  },
  {
    id: 'preset-zen',
    name: 'Zen Harmonic Bowl',
    subtitle: 'Serene acoustic resonance',
    url: 'https://actions.google.com/sounds/v1/household/clock_ticking.ogg',
    category: 'zen' as const,
    icon: 'flower',
    color: '#F59E0B',
  },
  {
    id: 'preset-pip',
    name: 'Prompt Double Pip',
    subtitle: 'Short discrete reminder pip',
    url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
    category: 'beeper' as const,
    icon: 'volume-medium',
    color: '#06B6D4',
  },
];

const VIBRATION_OPTIONS: { id: 'urgent' | 'standard' | 'gentle' | 'heartbeat'; label: string; desc: string }[] = [
  { id: 'urgent', label: 'Urgent', desc: 'Fast, sharp pulses' },
  { id: 'standard', label: 'Standard', desc: 'Balanced interval pulses' },
  { id: 'gentle', label: 'Gentle', desc: 'Soft low vibration' },
  { id: 'heartbeat', label: 'Heartbeat', desc: 'Double thump rhythm' },
];

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

  // Admin Panel: Get all registered users (Strictly for ADMIN role)
  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
  const {
    data: allUsersResponse,
    isFetching: isFetchingAllUsers,
    refetch: refetchAllUsers,
  } = useGetAllUsersQuery(undefined, {
    skip: !isAdmin,
    refetchOnMountOrArgChange: true,
  });

  // Settings State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Redux Alarm & Ringtone State
  const alarmSettings = useAppSelector((state) => state.alarmSettings);
  const activeRingtoneId = alarmSettings?.activeRingtoneId || 'digital-pager';
  const ringtonesList = alarmSettings?.ringtones || [];
  const isVibrationActive = alarmSettings?.vibrationEnabled ?? true;

  const currentRingtone =
    ringtonesList.find((r) => r.id === activeRingtoneId) || ringtonesList[0];

  // Sound Preview State
  const [playingRingtoneId, setPlayingRingtoneId] = useState<string | null>(null);

  const handleTogglePreview = async (soundUrl: string, ringtoneId: string) => {
    if (playingRingtoneId === ringtoneId) {
      stopRingtonePreview();
      setPlayingRingtoneId(null);
    } else {
      setPlayingRingtoneId(ringtoneId);
      await previewRingtoneSound(soundUrl);
    }
  };

  // Ringtone Selection (Update Active Ringtone)
  const handleSelectRingtone = (ringtone: RingtoneItem) => {
    dispatch(setActiveRingtone(ringtone.id));
    setActiveSoundUrl(ringtone.soundUrl);
  };

  // Custom Ringtone Modal (Create / Update CRUD)
  const [isRingtoneModalVisible, setIsRingtoneModalVisible] = useState(false);
  const [editingRingtoneId, setEditingRingtoneId] = useState<string | null>(null);
  const [ringtoneFormName, setRingtoneFormName] = useState('');
  const [ringtoneFormDesc, setRingtoneFormDesc] = useState('');
  const [ringtoneFormToneUrl, setRingtoneFormToneUrl] = useState(TONE_PRESETS[0].url);
  const [ringtoneFormCategory, setRingtoneFormCategory] = useState<'beeper' | 'chime' | 'bell' | 'radar' | 'zen'>('chime');
  const [ringtoneFormVibration, setRingtoneFormVibration] = useState<'urgent' | 'standard' | 'gentle' | 'heartbeat'>('standard');

  const openAddRingtoneModal = () => {
    stopRingtonePreview();
    setPlayingRingtoneId(null);
    setEditingRingtoneId(null);
    setRingtoneFormName('');
    setRingtoneFormDesc('Personal medication alert tone');
    setRingtoneFormToneUrl(TONE_PRESETS[1].url);
    setRingtoneFormCategory('chime');
    setRingtoneFormVibration('standard');
    setIsRingtoneModalVisible(true);
  };

  const openEditRingtoneModal = (item: RingtoneItem) => {
    stopRingtonePreview();
    setPlayingRingtoneId(null);
    setEditingRingtoneId(item.id);
    setRingtoneFormName(item.name);
    setRingtoneFormDesc(item.description);
    setRingtoneFormToneUrl(item.soundUrl);
    setRingtoneFormCategory((item.category as any) || 'chime');
    setRingtoneFormVibration(item.vibrationPattern || 'standard');
    setIsRingtoneModalVisible(true);
  };

  const handleSaveRingtone = () => {
    if (!ringtoneFormName.trim()) {
      Alert.alert('Required Name', 'Please give your custom ringtone a name.');
      return;
    }

    const matchedPreset = TONE_PRESETS.find((p) => p.url === ringtoneFormToneUrl) || TONE_PRESETS[0];

    if (editingRingtoneId) {
      dispatch(
        updateCustomRingtone({
          id: editingRingtoneId,
          data: {
            name: ringtoneFormName.trim(),
            description: ringtoneFormDesc.trim(),
            soundUrl: ringtoneFormToneUrl,
            category: ringtoneFormCategory,
            icon: matchedPreset.icon,
            color: matchedPreset.color,
            vibrationPattern: ringtoneFormVibration,
          },
        })
      );
      if (activeRingtoneId === editingRingtoneId) {
        setActiveSoundUrl(ringtoneFormToneUrl);
      }
      Alert.alert('Ringtone Updated! 🔔', `"${ringtoneFormName.trim()}" was updated successfully.`);
    } else {
      const newId = `custom-tone-${Date.now()}`;
      const newRingtone: RingtoneItem = {
        id: newId,
        name: ringtoneFormName.trim(),
        description: ringtoneFormDesc.trim() || 'Custom medication alarm ringtone',
        soundUrl: ringtoneFormToneUrl,
        category: ringtoneFormCategory,
        icon: matchedPreset.icon,
        color: matchedPreset.color,
        vibrationPattern: ringtoneFormVibration,
        isCustom: true,
      };
      dispatch(addCustomRingtone(newRingtone));
      setActiveSoundUrl(newRingtone.soundUrl);
      Alert.alert('Ringtone Created! 🎉', `"${newRingtone.name}" has been created and set as your active alarm tone!`);
    }

    stopRingtonePreview();
    setPlayingRingtoneId(null);
    setIsRingtoneModalVisible(false);
  };

  const handleDeleteRingtone = (item: RingtoneItem) => {
    Alert.alert(
      'Delete Ringtone',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (playingRingtoneId === item.id) {
              stopRingtonePreview();
              setPlayingRingtoneId(null);
            }
            dispatch(deleteCustomRingtone(item.id));
          },
        },
      ]
    );
  };

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

        {/* Section: Admin Panel (👑 Strictly for ADMIN Role) */}
        {isAdmin && (
          <View style={styles.adminCard}>
            <View style={styles.adminCardHeader}>
              <View style={styles.adminCardIconBox}>
                <Ionicons name="shield-checkmark" size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Text style={styles.adminCardTitle}>Admin Panel</Text>
                  <View style={styles.adminOnlyTag}>
                    <Text style={styles.adminOnlyTagText}>ADMIN ONLY</Text>
                  </View>
                </View>
                <Text style={styles.adminCardSub}>
                  {allUsersResponse?.total ?? 6} registered users in Neon PostgreSQL
                </Text>
              </View>
              <TouchableOpacity
                style={styles.adminViewBtn}
                onPress={() => setIsAdminModalVisible(true)}
                activeOpacity={0.8}>
                <Text style={styles.adminViewBtnText}>View All</Text>
                <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

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

        {/* Section: Medication Alarms & Ringtones (Full CRUD Management) */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionHeaderTitle}>Alarms & Ringtones</Text>
            <Text style={styles.sectionHeaderSub}>
              Choose active alarm sound & manage custom tones
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addRingtoneHeaderBtn}
            onPress={openAddRingtoneModal}
            activeOpacity={0.8}
            accessibilityLabel="Add custom ringtone">
            <Ionicons name="add" size={15} color="#FFFFFF" />
            <Text style={styles.addRingtoneHeaderBtnText}>Add Tone</Text>
          </TouchableOpacity>
        </View>

        {/* Active Ringtone Quick Banner */}
        <View style={styles.activeToneBanner}>
          <View style={styles.activeToneLeft}>
            <View style={[styles.activeToneIconBadge, { backgroundColor: currentRingtone.color + '20' }]}>
              <Ionicons
                name={(currentRingtone.icon as any) || 'notifications'}
                size={22}
                color={currentRingtone.color || '#208AEF'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={styles.activeToneTitle} numberOfLines={1}>
                  {currentRingtone.name}
                </Text>
                <View style={styles.activeArmedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#15803D" />
                  <Text style={styles.activeArmedText}>Active Tone</Text>
                </View>
              </View>
              <Text style={styles.activeToneSub} numberOfLines={1}>
                {currentRingtone.description}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.previewActiveBtn,
              playingRingtoneId === currentRingtone.id && styles.previewActiveBtnPlaying,
            ]}
            onPress={() => handleTogglePreview(currentRingtone.soundUrl, currentRingtone.id)}
            activeOpacity={0.8}>
            <Ionicons
              name={playingRingtoneId === currentRingtone.id ? 'stop' : 'volume-high'}
              size={16}
              color={playingRingtoneId === currentRingtone.id ? '#EF4444' : '#208AEF'}
            />
            <Text
              style={[
                styles.previewActiveBtnText,
                playingRingtoneId === currentRingtone.id && styles.previewActiveBtnTextPlaying,
              ]}>
              {playingRingtoneId === currentRingtone.id ? 'Stop' : 'Test Tone'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* List of Available Ringtones (CRUD READ / SELECT / UPDATE / DELETE) */}
        <View style={styles.ringtonesCard}>
          <View style={styles.ringtonesCardHeader}>
            <Text style={styles.ringtonesCardHeaderTitle}>Available Ringtones ({ringtonesList.length})</Text>
            <Text style={styles.ringtonesCardHeaderSub}>Tap any ringtone to select as alarm sound</Text>
          </View>

          {ringtonesList.map((ringtone, index) => {
            const isCurrent = ringtone.id === activeRingtoneId;
            const isPlayingThis = playingRingtoneId === ringtone.id;

            return (
              <View
                key={ringtone.id}
                style={[
                  styles.ringtoneRow,
                  isCurrent && styles.ringtoneRowActive,
                  index < ringtonesList.length - 1 && styles.ringtoneRowBorder,
                ]}>
                {/* Radio / Selection Indicator */}
                <TouchableOpacity
                  style={styles.ringtoneSelectArea}
                  onPress={() => handleSelectRingtone(ringtone)}
                  activeOpacity={0.7}>
                  <View style={[styles.radioCircle, isCurrent && styles.radioCircleActive]}>
                    {isCurrent && <View style={styles.radioDot} />}
                  </View>

                  <View
                    style={[
                      styles.ringtoneIconBadge,
                      { backgroundColor: ringtone.color + '18' },
                    ]}>
                    <Ionicons
                      name={(ringtone.icon as any) || 'notifications'}
                      size={18}
                      color={ringtone.color || '#208AEF'}
                    />
                  </View>

                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text
                        style={[
                          styles.ringtoneNameText,
                          isCurrent && styles.ringtoneNameTextActive,
                        ]}
                        numberOfLines={1}>
                        {ringtone.name}
                      </Text>
                      {ringtone.isCustom && (
                        <View style={styles.customPill}>
                          <Text style={styles.customPillText}>Custom</Text>
                        </View>
                      )}
                      {isCurrent && (
                        <View style={styles.activePill}>
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.ringtoneDescText} numberOfLines={1}>
                      {ringtone.description}
                    </Text>
                    <View style={styles.vibrationTagRow}>
                      <Ionicons name="phone-portrait-outline" size={11} color="#94A3B8" />
                      <Text style={styles.vibrationTagText}>
                        Vibration: {ringtone.vibrationPattern.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Actions: Preview, Edit, Delete */}
                <View style={styles.ringtoneActionsRow}>
                  {/* Preview Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionIconBtn,
                      isPlayingThis && styles.actionIconBtnPlaying,
                    ]}
                    onPress={() => handleTogglePreview(ringtone.soundUrl, ringtone.id)}
                    activeOpacity={0.7}
                    accessibilityLabel="Preview sound">
                    <Ionicons
                      name={isPlayingThis ? 'stop' : 'play'}
                      size={14}
                      color={isPlayingThis ? '#EF4444' : '#208AEF'}
                    />
                  </TouchableOpacity>

                  {/* Edit Custom Button */}
                  {ringtone.isCustom && (
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => openEditRingtoneModal(ringtone)}
                      activeOpacity={0.7}
                      accessibilityLabel="Edit ringtone">
                      <Ionicons name="pencil" size={13} color="#64748B" />
                    </TouchableOpacity>
                  )}

                  {/* Delete Custom Button */}
                  {ringtone.isCustom && (
                    <TouchableOpacity
                      style={[styles.actionIconBtn, { backgroundColor: '#FEE2E2' }]}
                      onPress={() => handleDeleteRingtone(ringtone)}
                      activeOpacity={0.7}
                      accessibilityLabel="Delete ringtone">
                      <Ionicons name="trash-outline" size={13} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
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

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="phone-portrait-outline" size={18} color="#9333EA" />
              </View>
              <Text style={styles.menuText}>Alarm Vibration</Text>
            </View>
            <Switch
              value={isVibrationActive}
              onValueChange={(val) => {
                dispatch(setVibrationEnabled(val));
              }}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={isVibrationActive ? '#208AEF' : '#F1F5F9'}
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

      {/* CUSTOM RINGTONE CREATE / EDIT MODAL (CRUD) */}
      <Modal
        visible={isRingtoneModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          stopRingtonePreview();
          setIsRingtoneModalVisible(false);
        }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalRingtoneIconBox}>
                  <Ionicons name="musical-notes" size={20} color="#208AEF" />
                </View>
                <Text style={styles.modalTitle}>
                  {editingRingtoneId ? 'Edit Ringtone ✏️' : 'Add Custom Ringtone 🎵'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  stopRingtonePreview();
                  setIsRingtoneModalVisible(false);
                }}
                style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <Text style={styles.modalSub}>
                Customize sound tone preset, name, and vibration pattern for your medication alarm alerts.
              </Text>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ringtone Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="text-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    value={ringtoneFormName}
                    onChangeText={setRingtoneFormName}
                    placeholder="e.g. My Urgent Wakeup Chime"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Short Note / Description</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="information-circle-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    value={ringtoneFormDesc}
                    onChangeText={setRingtoneFormDesc}
                    placeholder="e.g. For morning blood pressure pills"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Sound Preset Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Sound Tone Preset</Text>
                <View style={styles.tonePresetsContainer}>
                  {TONE_PRESETS.map((preset) => {
                    const isSelected = ringtoneFormToneUrl === preset.url;
                    const isPlayingPreset = playingRingtoneId === preset.id;

                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.presetCard,
                          isSelected && styles.presetCardSelected,
                        ]}
                        onPress={() => {
                          setRingtoneFormToneUrl(preset.url);
                          setRingtoneFormCategory(preset.category);
                        }}
                        activeOpacity={0.75}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View
                            style={[
                              styles.presetIconBadge,
                              { backgroundColor: preset.color + '18' },
                            ]}>
                            <Ionicons
                              name={(preset.icon as any) || 'notifications'}
                              size={18}
                              color={preset.color}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.presetName,
                                isSelected && styles.presetNameSelected,
                              ]}>
                              {preset.name}
                            </Text>
                            <Text style={styles.presetSub}>{preset.subtitle}</Text>
                          </View>
                        </View>

                        {/* Test audio preview button */}
                        <TouchableOpacity
                          style={[
                            styles.presetPreviewBtn,
                            isPlayingPreset && styles.presetPreviewBtnPlaying,
                          ]}
                          onPress={() => handleTogglePreview(preset.url, preset.id)}
                          activeOpacity={0.7}>
                          <Ionicons
                            name={isPlayingPreset ? 'stop' : 'play'}
                            size={14}
                            color={isPlayingPreset ? '#EF4444' : '#208AEF'}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Vibration Pattern Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vibration Pattern</Text>
                <View style={styles.vibrationChipsRow}>
                  {VIBRATION_OPTIONS.map((opt) => {
                    const isSelected = ringtoneFormVibration === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.vibrationChip,
                          isSelected && styles.vibrationChipSelected,
                        ]}
                        onPress={() => setRingtoneFormVibration(opt.id)}
                        activeOpacity={0.75}>
                        <Ionicons
                          name="phone-portrait-outline"
                          size={14}
                          color={isSelected ? '#FFFFFF' : '#475569'}
                        />
                        <Text
                          style={[
                            styles.vibrationChipText,
                            isSelected && styles.vibrationChipTextSelected,
                          ]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  stopRingtonePreview();
                  setIsRingtoneModalVisible(false);
                }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveRingtone}
                activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>
                  {editingRingtoneId ? 'Save Changes' : 'Create Ringtone'}
                </Text>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Panel: Users Directory Modal (Strictly for ADMIN role) */}
      <Modal
        visible={isAdminModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsAdminModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          {/* Modal Header */}
          <View style={styles.adminModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.adminModalIconBadge}>
                <Ionicons name="shield-checkmark" size={20} color="#D97706" />
              </View>
              <View>
                <Text style={styles.adminModalTitle}>Admin Panel • Users</Text>
                <Text style={styles.adminModalSubtitle}>
                  {allUsersResponse?.total ?? 0} registered database accounts
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => refetchAllUsers()}
                style={styles.adminRefreshBtn}
                activeOpacity={0.7}>
                <Ionicons
                  name="refresh"
                  size={18}
                  color="#208AEF"
                  style={isFetchingAllUsers ? { opacity: 0.5 } : undefined}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsAdminModalVisible(false)}
                style={styles.adminCloseBtn}
                activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* User List */}
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}>
            {isFetchingAllUsers && (!allUsersResponse || allUsersResponse.data.length === 0) ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#208AEF" />
                <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>
                  Fetching users from Neon Cloud PostgreSQL...
                </Text>
              </View>
            ) : (
              (allUsersResponse?.data || []).map((u, idx) => {
                const isUserAdmin = u.role === 'ADMIN';
                return (
                  <View key={u.id || idx} style={styles.adminUserCard}>
                    <View style={styles.adminUserHeader}>
                      <View style={styles.adminUserAvatar}>
                        <Ionicons
                          name={isUserAdmin ? 'shield-checkmark' : 'person'}
                          size={18}
                          color={isUserAdmin ? '#D97706' : '#208AEF'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.adminUserName}>{u.name || 'Anonymous'}</Text>
                          <View
                            style={[
                              styles.adminRolePill,
                              isUserAdmin ? styles.adminRolePillGold : styles.adminRolePillBlue,
                            ]}>
                            <Text
                              style={[
                                styles.adminRolePillText,
                                isUserAdmin
                                  ? styles.adminRolePillTextGold
                                  : styles.adminRolePillTextBlue,
                              ]}>
                              {u.role}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.adminUserEmail}>{u.email}</Text>
                      </View>

                      <View
                        style={[
                          styles.verifyBadge,
                          u.isVerified ? styles.verifyBadgeSuccess : styles.verifyBadgePending,
                        ]}>
                        <Text
                          style={[
                            styles.verifyBadgeText,
                            u.isVerified ? styles.verifyTextSuccess : styles.verifyTextPending,
                          ]}>
                          {u.isVerified ? '✓ Verified' : 'Pending'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.adminUserMetaRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="medkit-outline" size={13} color="#64748B" />
                        <Text style={styles.adminUserMetaText}>
                          {u.medicationsCount ?? 0} medications
                        </Text>
                      </View>
                      <Text style={styles.adminUserMetaDivider}>•</Text>
                      <Text style={styles.adminUserMetaText}>
                        ID: {u.id ? u.id.slice(0, 8) + '...' : 'N/A'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
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
  // Admin Card & Modal Styles
  adminCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: 16,
    marginBottom: 20,
  },
  adminCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  adminCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  adminOnlyTag: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminOnlyTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  adminCardSub: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '500',
  },
  adminViewBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminViewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  adminModalIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminModalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  adminRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminUserCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  adminUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  adminUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  adminRolePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  adminRolePillGold: {
    backgroundColor: '#FEF3C7',
  },
  adminRolePillBlue: {
    backgroundColor: '#E0F2FE',
  },
  adminRolePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  adminRolePillTextGold: {
    color: '#B45309',
  },
  adminRolePillTextBlue: {
    color: '#0369A1',
  },
  adminUserEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  verifyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifyBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  verifyBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  verifyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  verifyTextSuccess: {
    color: '#15803D',
  },
  verifyTextPending: {
    color: '#B45309',
  },
  adminUserMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  adminUserMetaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  adminUserMetaDivider: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  // Alarm & Ringtone CRUD Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  addRingtoneHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#208AEF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#208AEF',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addRingtoneHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeToneBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeToneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activeToneIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeToneTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeArmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  activeArmedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  activeToneSub: {
    fontSize: 11,
    color: '#64748B',
  },
  previewActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  previewActiveBtnPlaying: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  previewActiveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#208AEF',
  },
  previewActiveBtnTextPlaying: {
    color: '#EF4444',
  },
  ringtonesCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  ringtonesCardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ringtonesCardHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  ringtonesCardHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  ringtoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  ringtoneRowActive: {
    backgroundColor: '#F0F9FF',
  },
  ringtoneRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ringtoneSelectArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#208AEF',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#208AEF',
  },
  ringtoneIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringtoneNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  ringtoneNameTextActive: {
    color: '#0369A1',
    fontWeight: '800',
  },
  customPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  customPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7C3AED',
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  ringtoneDescText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  vibrationTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  vibrationTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  ringtoneActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBtnPlaying: {
    backgroundColor: '#FEE2E2',
  },
  modalCardLarge: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalRingtoneIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tonePresetsContainer: {
    gap: 8,
    marginTop: 4,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  presetCardSelected: {
    borderColor: '#208AEF',
    backgroundColor: '#EFF6FF',
  },
  presetIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  presetNameSelected: {
    color: '#0369A1',
    fontWeight: '800',
  },
  presetSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  presetPreviewBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  presetPreviewBtnPlaying: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  vibrationChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  vibrationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vibrationChipSelected: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  vibrationChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  vibrationChipTextSelected: {
    color: '#FFFFFF',
  },
});
