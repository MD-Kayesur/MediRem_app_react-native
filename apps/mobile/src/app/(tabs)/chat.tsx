import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/slices/authSlice';
import {
  useGetSupportMessagesQuery,
  useSendSupportMessageMutation,
  useGetAdminThreadsQuery,
} from '@/redux';
import { SupportMessage, SupportThread } from '@medirem/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  getSocket,
  socketJoinThread,
  socketLeaveThread,
  socketSendMessage,
  socketEmitTyping,
  socketEmitStopTyping,
} from '@/utils/socketService';

export default function ChatScreen() {
  const { timeTheme } = useAppTheme();
  const currentUser = useAppSelector(selectCurrentUser);
  const isAdmin = currentUser?.role === 'ADMIN';

  const params = useLocalSearchParams<{ targetUserId?: string; userName?: string }>();
  const [selectedThreadUser, setSelectedThreadUser] = useState<{
    id: string;
    name: string;
    email?: string | null;
  } | null>(
    params.targetUserId
      ? { id: params.targetUserId, name: params.userName || 'User' }
      : null
  );

  const [inputMessage, setInputMessage] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [typingStatus, setTypingStatus] = useState<string | null>(null);
  const [socketMessages, setSocketMessages] = useState<SupportMessage[]>([]);

  const scrollViewRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Active thread owner: regular user has their own thread; Admin views selected user's thread
  const activeThreadUserId = isAdmin ? selectedThreadUser?.id : currentUser?.id;

  // 1. Permanently maintained history from Neon Cloud PostgreSQL
  const {
    data: threadResponse,
    isLoading: isLoadingHistory,
    isFetching: isFetchingHistory,
    refetch: refetchHistory,
  } = useGetSupportMessagesQuery(activeThreadUserId, {
    skip: !activeThreadUserId,
  });

  // For Admin: query all user conversation threads from database
  const {
    data: adminThreadsResponse,
    isLoading: isLoadingAdminThreads,
    refetch: refetchAdminThreads,
  } = useGetAdminThreadsQuery(undefined, {
    skip: !isAdmin,
  });

  const [sendMessageApi, { isLoading: isSending }] = useSendSupportMessageMutation();

  // Combine permanently stored DB messages with real-time incoming Socket.IO messages
  const allMessages = useMemo(() => {
    const map = new Map<string, SupportMessage>();
    // Stored database history
    (threadResponse?.data || []).forEach((m) => map.set(m.id, m));
    // Live socket messages
    socketMessages.forEach((m) => map.set(m.id, m));
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [threadResponse?.data, socketMessages]);

  const adminThreads: SupportThread[] = adminThreadsResponse?.data || [];

  // ==========================================
  // REAL-TIME SOCKET.IO EVENT LISTENERS
  // ==========================================
  useEffect(() => {
    const socket = getSocket();

    const updateConnState = () => {
      setIsSocketConnected(socket.connected);
    };

    socket.on('connect', updateConnState);
    socket.on('disconnect', updateConnState);
    updateConnState();

    // Live incoming message via Socket.IO
    const handleNewMessage = (newMsg: SupportMessage) => {
      if (newMsg && newMsg.userId === activeThreadUserId) {
        setSocketMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    };

    // Live Admin inbox thread update
    const handleThreadUpdated = () => {
      if (isAdmin) {
        refetchAdminThreads();
      }
    };

    // Live typing indicator
    const handleUserTyping = (data: { name: string; role: 'USER' | 'ADMIN' }) => {
      setTypingStatus(`${data.role === 'ADMIN' ? 'Admin' : data.name} is typing...`);
    };

    const handleUserStopTyping = () => {
      setTypingStatus(null);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleNewMessage);
    socket.on('thread_updated', handleThreadUpdated);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.off('connect', updateConnState);
      socket.off('disconnect', updateConnState);
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleNewMessage);
      socket.off('thread_updated', handleThreadUpdated);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
    };
  }, [activeThreadUserId, isAdmin, refetchAdminThreads]);

  // Join the thread room on socket connect/change
  useEffect(() => {
    if (activeThreadUserId) {
      socketJoinThread(activeThreadUserId, currentUser?.role);
    }
    return () => {
      if (activeThreadUserId) {
        socketLeaveThread(activeThreadUserId);
      }
    };
  }, [activeThreadUserId, currentUser?.role]);

  // Auto-scroll down on new messages
  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 120);
    }
  }, [allMessages.length]);

  // Handle typing event emission
  const handleInputChange = (text: string) => {
    setInputMessage(text);
    if (!activeThreadUserId || !currentUser) return;

    socketEmitTyping(activeThreadUserId, currentUser.name, currentUser.role as any);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socketEmitStopTyping(activeThreadUserId);
    }, 1500);
  };

  // Send message: emits via Socket.IO for sub-millisecond delivery & persists in Neon DB
  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isSending) return;

    if (isAdmin && !selectedThreadUser?.id) {
      Alert.alert('Notice', 'Please select a user thread first to send an Admin reply.');
      return;
    }

    if (activeThreadUserId) {
      socketEmitStopTyping(activeThreadUserId);
    }

    setInputMessage('');

    // 1. Real-time Socket.IO emission
    socketSendMessage({
      senderId: currentUser?.id || '',
      senderEmail: currentUser?.email || undefined,
      message: textToSend,
      userId: isAdmin ? selectedThreadUser?.id : undefined,
    });

    // 2. Persistent Neon Cloud database storage
    try {
      await sendMessageApi({
        message: textToSend,
        userId: isAdmin ? selectedThreadUser?.id : undefined,
      }).unwrap();

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      console.warn('[Chat] Message persistence note:', err?.message || err);
    }
  };

  const formatTimestamp = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // ==========================================
  // VIEW 1: ADMIN INBOX (Admin viewing all incoming user messages)
  // ==========================================
  if (isAdmin && !selectedThreadUser) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: timeTheme.colors.background }]}
        edges={['top', 'left', 'right']}>
        {/* Admin Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: timeTheme.colors.card,
              borderBottomColor: timeTheme.colors.cardBorder,
            },
          ]}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
            style={[styles.headerBtn, { borderColor: timeTheme.colors.cardBorder }]}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={timeTheme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.headerTitle, { color: timeTheme.colors.textPrimary }]}>
                Admin Support Desk
              </Text>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <View
                style={[
                  styles.socketDot,
                  { backgroundColor: isSocketConnected ? '#10B981' : '#F59E0B' },
                ]}
              />
              <Text style={[styles.headerSubtitle, { color: timeTheme.colors.textSecondary }]}>
                {isSocketConnected ? 'Socket.IO Live' : 'Connecting WebSocket...'} •{' '}
                {adminThreads.length} User Conversations
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => refetchAdminThreads()}
            style={[styles.headerBtn, { borderColor: timeTheme.colors.cardBorder }]}
            activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color="#208AEF" />
          </TouchableOpacity>
        </View>

        {/* User Threads List */}
        {isLoadingAdminThreads ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#208AEF" />
            <Text style={[styles.loadingText, { color: timeTheme.colors.textSecondary }]}>
              Loading user support threads...
            </Text>
          </View>
        ) : adminThreads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="chatbubbles-outline" size={42} color="#94A3B8" />
            </View>
            <Text style={[styles.emptyTitle, { color: timeTheme.colors.textPrimary }]}>
              No User Messages Yet
            </Text>
            <Text style={[styles.emptySub, { color: timeTheme.colors.textSecondary }]}>
              When users report a bug or message the admin, their conversations will appear here
              in real time with unread counters.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.threadsList}>
            {adminThreads.map((thread) => {
              const hasUnread = thread.unreadCount > 0;
              return (
                <TouchableOpacity
                  key={thread.userId}
                  style={[
                    styles.threadCard,
                    {
                      backgroundColor: timeTheme.colors.card,
                      borderColor: hasUnread ? '#208AEF' : timeTheme.colors.cardBorder,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedThreadUser({
                      id: thread.userId,
                      name: thread.user?.name || 'User',
                      email: thread.user?.email,
                    });
                  }}>
                  <View style={styles.threadAvatar}>
                    <Text style={styles.threadAvatarText}>
                      {(thread.user?.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                      <Text style={[styles.threadUserName, { color: timeTheme.colors.textPrimary }]}>
                        {thread.user?.name || 'User'}
                      </Text>
                      <Text style={[styles.threadTime, { color: timeTheme.colors.textSecondary }]}>
                        {formatTimestamp(thread.lastMessage.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.threadEmail, { color: timeTheme.colors.textSecondary }]}>
                      {thread.user?.email || 'No email provided'}
                    </Text>
                    <Text
                      style={[
                        styles.threadLastMsg,
                        {
                          color: hasUnread
                            ? timeTheme.colors.textPrimary
                            : timeTheme.colors.textSecondary,
                        },
                        hasUnread && { fontWeight: '700' },
                      ]}
                      numberOfLines={1}>
                      {thread.lastMessage.senderRole === 'ADMIN' ? 'You: ' : ''}
                      {thread.lastMessage.message}
                    </Text>
                  </View>
                  {hasUnread ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{thread.unreadCount}</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ==========================================
  // VIEW 2: 1-ON-1 CONVERSATION (User messaging Admin, or Admin in user thread)
  // ==========================================
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: timeTheme.colors.background }]}
      edges={['top', 'left', 'right']}>
      {/* Top Header Card: Shows Admin Profile & Real-Time Status */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: timeTheme.colors.card,
            borderBottomColor: timeTheme.colors.cardBorder,
          },
        ]}>
        <TouchableOpacity
          onPress={() => {
            if (isAdmin && selectedThreadUser) {
              setSelectedThreadUser(null);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile');
            }
          }}
          style={[styles.headerBtn, { borderColor: timeTheme.colors.cardBorder }]}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={timeTheme.colors.textPrimary} />
        </TouchableOpacity>

        {/* Profile Details of the Other Party */}
        <View style={styles.headerProfileBox}>
          <View style={styles.headerAvatarContainer}>
            <View
              style={[
                styles.headerAvatar,
                { backgroundColor: isAdmin ? '#208AEF' : '#059669' },
              ]}>
              <Ionicons
                name={isAdmin ? 'person' : 'shield-checkmark'}
                size={18}
                color="#FFFFFF"
              />
            </View>
            <View
              style={[
                styles.headerOnlineDot,
                { backgroundColor: isSocketConnected ? '#10B981' : '#F59E0B' },
              ]}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.headerTitle, { color: timeTheme.colors.textPrimary }]}>
                {isAdmin
                  ? selectedThreadUser?.name || 'User'
                  : 'MediRem Support Admin'}
              </Text>
              <View
                style={[
                  styles.verifiedBadge,
                  { backgroundColor: isAdmin ? '#EFF6FF' : '#DCFCE7' },
                ]}>
                <Ionicons
                  name="shield-checkmark"
                  size={10}
                  color={isAdmin ? '#208AEF' : '#15803D'}
                />
                <Text
                  style={[
                    styles.verifiedBadgeText,
                    { color: isAdmin ? '#1D4ED8' : '#15803D' },
                  ]}>
                  {isAdmin ? 'USER' : 'VERIFIED ADMIN'}
                </Text>
              </View>
            </View>

            <Text style={[styles.headerSubtitle, { color: timeTheme.colors.textSecondary }]}>
              {isAdmin
                ? selectedThreadUser?.email || 'User'
                : 'Direct Socket.IO • History saved & maintained'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => refetchHistory()}
          style={[styles.headerBtn, { borderColor: timeTheme.colors.cardBorder }]}
          activeOpacity={0.7}>
          {isFetchingHistory ? (
            <ActivityIndicator size="small" color="#208AEF" />
          ) : (
            <Ionicons name="refresh" size={18} color="#208AEF" />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        {/* Message Stream */}
        {isLoadingHistory && allMessages.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#208AEF" />
            <Text style={[styles.loadingText, { color: timeTheme.colors.textSecondary }]}>
              Loading conversation history from database...
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}>
            {/* Top Admin Welcome & Notice Banner */}
            <View
              style={[
                styles.adminWelcomeCard,
                {
                  backgroundColor: timeTheme.isDark ? '#0B233A' : '#EFF6FF',
                  borderColor: timeTheme.isDark ? '#1E3A8A' : '#BFDBFE',
                },
              ]}>
              <View style={styles.adminWelcomeIconBox}>
                <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.adminWelcomeTitle, { color: timeTheme.colors.textPrimary }]}>
                  {isAdmin ? 'Admin Reply Terminal' : 'Official Admin Support Desk'}
                </Text>
                <Text style={[styles.adminWelcomeSub, { color: timeTheme.colors.textSecondary }]}>
                  {isAdmin
                    ? 'Reply to this user\'s bug report. Messages are transmitted live via Socket.IO and stored in Neon DB.'
                    : 'Describe any bugs, alarm glitches, or medication sync issues. Admin receives your message and replies right here!'}
                </Text>
              </View>
            </View>

            {allMessages.length === 0 ? (
              <View style={styles.emptyThreadBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={38} color="#94A3B8" />
                <Text style={[styles.emptyThreadTitle, { color: timeTheme.colors.textPrimary }]}>
                  Start Conversation with Admin
                </Text>
                <Text style={[styles.emptyThreadSub, { color: timeTheme.colors.textSecondary }]}>
                  {isAdmin
                    ? 'No messages sent by this user yet.'
                    : 'Send a message below to reach the Admin directly.'}
                </Text>
              </View>
            ) : (
              allMessages.map((msg) => {
                const isMsgFromAdmin = msg.senderRole === 'ADMIN';
                const isMyMessage = isAdmin ? isMsgFromAdmin : !isMsgFromAdmin;

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.msgRow,
                      isMyMessage ? styles.msgRowRight : styles.msgRowLeft,
                    ]}>
                    <View
                      style={[
                        styles.msgBubble,
                        isMyMessage
                          ? styles.myBubble
                          : [
                              styles.otherBubble,
                              {
                                backgroundColor: timeTheme.colors.card,
                                borderColor: timeTheme.colors.cardBorder,
                              },
                            ],
                      ]}>
                      {/* Sender identification header */}
                      <View style={styles.bubbleHeader}>
                        <View
                          style={[
                            styles.roleChip,
                            isMsgFromAdmin ? styles.adminRoleChip : styles.userRoleChip,
                          ]}>
                          <Ionicons
                            name={isMsgFromAdmin ? 'shield-checkmark' : 'person'}
                            size={10}
                            color="#FFFFFF"
                          />
                          <Text style={styles.roleChipText}>
                            {isMsgFromAdmin ? 'ADMIN' : 'USER'}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.senderName,
                            { color: isMyMessage ? '#E0F2FE' : timeTheme.colors.textSecondary },
                          ]}>
                          {msg.senderName}
                        </Text>
                      </View>

                      {/* Message Content */}
                      <Text
                        style={[
                          styles.msgText,
                          { color: isMyMessage ? '#FFFFFF' : timeTheme.colors.textPrimary },
                        ]}>
                        {msg.message}
                      </Text>

                      {/* Footer: Timestamp and Read Checkmarks */}
                      <View style={styles.bubbleFooter}>
                        <Text
                          style={[
                            styles.timestampText,
                            { color: isMyMessage ? '#BAE6FD' : '#94A3B8' },
                          ]}>
                          {formatTimestamp(msg.createdAt)}
                        </Text>
                        {isMyMessage && (
                          <Ionicons
                            name={msg.isRead ? 'checkmark-done' : 'checkmark'}
                            size={14}
                            color={msg.isRead ? '#10B981' : '#BAE6FD'}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* Live Typing Indicator */}
            {typingStatus && (
              <View style={styles.typingIndicatorRow}>
                <View style={styles.typingDot} />
                <Text style={[styles.typingText, { color: timeTheme.colors.textSecondary }]}>
                  {typingStatus}
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Bottom Message Input Bar */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: timeTheme.colors.card,
              borderTopColor: timeTheme.colors.cardBorder,
            },
          ]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: timeTheme.isDark ? '#0F172A' : '#F1F5F9',
                color: timeTheme.colors.textPrimary,
                borderColor: timeTheme.colors.cardBorder,
              },
            ]}
            placeholder={
              isAdmin
                ? `Reply to ${selectedThreadUser?.name || 'User'} via Socket.IO...`
                : 'Message Admin or describe a bug...'
            }
            placeholderTextColor={timeTheme.colors.textSecondary}
            value={inputMessage}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputMessage.trim() || isSending) && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputMessage.trim() || isSending}
            activeOpacity={0.8}>
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfileBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  socketDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  threadsList: {
    padding: 16,
    gap: 12,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  threadAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  threadAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  threadUserName: {
    fontSize: 15,
    fontWeight: '700',
  },
  threadTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  threadEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  threadLastMsg: {
    fontSize: 13,
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: '#208AEF',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  adminWelcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  adminWelcomeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adminWelcomeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  adminWelcomeSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyThreadBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyThreadTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyThreadSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#208AEF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderWidth: 1.5,
    borderBottomLeftRadius: 4,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminRoleChip: {
    backgroundColor: '#10B981',
  },
  userRoleChip: {
    backgroundColor: '#6366F1',
  },
  roleChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  timestampText: {
    fontSize: 10,
  },
  typingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#208AEF',
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
});
