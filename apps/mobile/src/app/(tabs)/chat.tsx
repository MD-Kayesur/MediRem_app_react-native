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
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/slices/authSlice';
import { useGetMedicationsQuery, useSendChatMessageMutation } from '@/redux';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  category?: string;
  quickReplies?: string[];
  isLiveAi?: boolean;
}

let messageCounter = 0;
function createUniqueId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}_${messageCounter}`;
}

function getFormattedTime(): string {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const user = useAppSelector(selectCurrentUser);
  const activeUserId = user?.id;

  // Real medications from Neon Cloud PostgreSQL for this specific user
  const { data: dbMeds = [] } = useGetMedicationsQuery(activeUserId, {
    refetchOnMountOrArgChange: true,
  });

  const [sendChatMessageMutation] = useSendChatMessageMutation();

  const initialGreeting = useMemo<ChatMessage>(() => {
    const patientName = user?.name || 'Friend';
    const medsCount = dbMeds.length;
    const medSummary =
      medsCount > 0
        ? `I have access to your **${medsCount}** scheduled medication(s) (${dbMeds.map((m) => m.name).join(', ')}).`
        : 'You currently have no active medications in your schedule. You can add one in the Meds tab!';

    return {
      id: 'welcome-init',
      sender: 'ai',
      text: `Hello **${patientName}**! 👋 I'm your **MediRem AI Personal Medical Assistant**.\n\n${medSummary}\n\nAsk me anything about your dose schedules, instructions, remaining pills, side effects, or food guidelines!`,
      timestamp: 'Just now',
      quickReplies:
        medsCount > 0
          ? ['💊 What are my medications?', '⏰ Today schedule', '📦 Check pills left']
          : ['📋 How to add medications?', '⏰ Missed dose rule', '🔔 Alarm features'],
    };
  }, [user?.name, dbMeds]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // Dynamically derive messages with initial greeting when empty
  const allMessages = useMemo<ChatMessage[]>(() => {
    return messages.length === 0 ? [initialGreeting] : messages;
  }, [messages, initialGreeting]);

  // Dynamic Suggestion Chips tailored to this user's live database records
  const dynamicChips = useMemo(() => {
    const chips: { label: string; query: string }[] = [];

    if (dbMeds && dbMeds.length > 0) {
      chips.push({
        label: '💊 My Schedule',
        query: 'What medications am I scheduled to take today?',
      });
      chips.push({
        label: '📦 Pills Left',
        query: 'How many pills do I have remaining in my inventory?',
      });
      chips.push({
        label: `⏰ ${dbMeds[0].name} Timing`,
        query: `When and how should I take ${dbMeds[0].name}?`,
      });
      if (dbMeds.length > 1) {
        chips.push({
          label: `🔍 ${dbMeds[1].name} Instructions`,
          query: `What are the dosage and instructions for ${dbMeds[1].name}?`,
        });
      }
      chips.push({
        label: '⚠️ Missed Dose',
        query: 'What should I do if I miss a scheduled dose?',
      });
      chips.push({
        label: '🍎 Food Advice',
        query: 'Which of my medications should be taken with or after food?',
      });
    } else {
      chips.push({
        label: '📋 My Medications',
        query: 'What medications do I have in my schedule?',
      });
      chips.push({
        label: '⏰ Missed Dose Rule',
        query: 'What should I do if I miss a scheduled dose?',
      });
      chips.push({
        label: '🍎 Food & Medicine',
        query: 'What medications must be taken with food?',
      });
      chips.push({
        label: '🔔 MediRem Alarms',
        query: 'How do MediRem alarms and repeat alerts work?',
      });
    }

    return chips;
  }, [dbMeds]);

  // Pulse animation for online indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [allMessages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: createUniqueId('user'),
      sender: 'user',
      text,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Build conversation history (up to last 6 messages)
      const conversationHistory = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      // Send to Backend AI API with strict User ID isolation
      const res = await sendChatMessageMutation({
        message: text,
        userId: user?.id,
        userEmail: user?.email,
        conversationHistory,
      }).unwrap();

      const aiMsg: ChatMessage = {
        id: createUniqueId('ai'),
        sender: 'ai',
        text: res.text,
        timestamp: getFormattedTime(),
        quickReplies: res.quickReplies,
        isLiveAi: res.isLiveAi,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      // Offline fallback: Answer using client-cached database medications!
      const fallbackReply = generateLocalDatabaseFallback(text, user, dbMeds);
      const aiMsg: ChatMessage = {
        id: createUniqueId('ai'),
        sender: 'ai',
        text: fallbackReply.text,
        timestamp: getFormattedTime(),
        quickReplies: fallbackReply.quickReplies,
        isLiveAi: false,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      'Reset Conversation?',
      'Clear chat history and start a fresh session with your medical assistant?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => setMessages([]),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.botAvatar}>
            <LinearBotIcon />
            <Animated.View style={[styles.onlineDot, { opacity: pulseAnim }]} />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>MediRem AI</Text>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                <Text style={styles.aiBadgeText}>Assistant</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              {user?.name ? `${user.name}'s Medical Copilot` : '24/7 Smart Medication Guide'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleClearChat}
          style={styles.clearBtn}
          activeOpacity={0.7}
          accessibilityLabel="Reset conversation">
          <Ionicons name="refresh" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Suggestion Chips Horizontal Bar */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}>
          {dynamicChips.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleSendMessage(chip.query)}
              style={styles.chipButton}
              activeOpacity={0.75}>
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat Messages Stream */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}>
        {allMessages.map((msg) => {
          const isAi = msg.sender === 'ai';
          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isAi ? styles.messageRowAi : styles.messageRowUser,
              ]}>
              {/* Bot Avatar on the left */}
              {isAi && (
                <View style={styles.msgAvatarBox}>
                  <Ionicons name="sparkles" size={14} color="#208AEF" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isAi ? styles.bubbleAi : styles.bubbleUser,
                ]}>
                {/* Formatted Message Content */}
                <FormattedText text={msg.text} isAi={isAi} />

                {/* Timestamp & Source badge */}
                <View style={styles.metaRow}>
                  <Text
                    style={[
                      styles.timestamp,
                      isAi ? styles.timestampAi : styles.timestampUser,
                    ]}>
                    {msg.timestamp}
                  </Text>
                  {isAi && (
                    <Text style={styles.aiSourceText}>
                      {msg.isLiveAi ? '• Real AI' : '• Database'}
                    </Text>
                  )}
                </View>

                {/* Follow-up Quick Action Pills */}
                {isAi && msg.quickReplies && msg.quickReplies.length > 0 && (
                  <View style={styles.quickRepliesBox}>
                    {msg.quickReplies.map((reply, rIdx) => (
                      <TouchableOpacity
                        key={rIdx}
                        onPress={() => handleSendMessage(reply)}
                        style={styles.quickReplyPill}
                        activeOpacity={0.75}>
                        <Ionicons name="chatbubble-ellipses-outline" size={11} color="#208AEF" />
                        <Text style={styles.quickReplyText}>{reply}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Real-time Typing Bubble */}
        {isTyping && (
          <View style={[styles.messageRow, styles.messageRowAi]}>
            <View style={styles.msgAvatarBox}>
              <Ionicons name="sparkles" size={14} color="#208AEF" />
            </View>
            <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
              <Text style={styles.typingText}>MediRem AI is analyzing records...</Text>
              <View style={styles.dotsRow}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}

        {/* Bottom Medical Disclaimer */}
        <View style={styles.medicalDisclaimerCard}>
          <Ionicons name="shield-checkmark" size={14} color="#64748B" />
          <Text style={styles.medicalDisclaimerText}>
            Personalized guidance based on your database regimen. In emergencies, contact a physician immediately.
          </Text>
        </View>
      </ScrollView>

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.inputArea}>
          <TextInput
            placeholder="Ask about your medications, schedule, stock..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
            returnKeyType="send"
            multiline={false}
            style={styles.textInput}
          />

          <TouchableOpacity
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isTyping}
            style={[
              styles.sendButton,
              (!inputText.trim() || isTyping) && styles.sendButtonDisabled,
            ]}
            activeOpacity={0.8}>
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Intelligent Local Fallback in case of network downtime
 * Answers directly from the client's cached PostgreSQL medication rows
 */
function generateLocalDatabaseFallback(
  userQuery: string,
  user: any,
  meds: any[],
): { text: string; quickReplies?: string[] } {
  const q = userQuery.toLowerCase().trim();
  const patientName = user?.name || 'Friend';

  if (
    q.includes('my med') ||
    q.includes('what med') ||
    q.includes('list') ||
    q.includes('schedule') ||
    q.includes('routine') ||
    q.includes('today')
  ) {
    if (meds.length === 0) {
      return {
        text: `Hello **${patientName}**! You do not have any active medications in your schedule right now.\n\nAdd one in the **Meds** tab to start tracking doses and alarms.`,
        quickReplies: ['How to add a medication', 'Alarm settings'],
      };
    }

    const listStr = meds
      .map((m) => {
        let timeText = m.time || m.timeSlot || 'Scheduled';
        if (m.times) {
          try {
            const parsed = JSON.parse(m.times);
            if (Array.isArray(parsed) && parsed.length > 0) {
              timeText = parsed.map((p: any) => `${p.slot} (${p.time})`).join(', ');
            }
          } catch {
            // fallback
          }
        }
        return `• **${m.name}** (${m.dosage})\n  ⏰ **Time:** ${timeText}\n  📦 **Pills Left:** ${m.pillsLeft} of ${m.totalPills}\n  📋 **Instructions:** ${m.instructions || 'Take as prescribed'}`;
      })
      .join('\n\n');

    return {
      text: `📋 **Your Live Medication Schedule (${patientName}):**\n\n${listStr}`,
      quickReplies: ['Check remaining pills', 'Missed dose advice'],
    };
  }

  if (q.includes('pill') || q.includes('left') || q.includes('stock') || q.includes('refill')) {
    if (meds.length === 0) {
      return {
        text: `You have no medications recorded in your inventory yet, **${patientName}**.`,
      };
    }

    const stockSummary = meds
      .map((m) => `• **${m.name}**: **${m.pillsLeft}** pills left (out of ${m.totalPills})`)
      .join('\n');

    return {
      text: `📦 **Inventory Status for ${patientName}:**\n\n${stockSummary}`,
      quickReplies: ['My schedule', 'Missed dose advice'],
    };
  }

  // Matching medication by name in user's database
  const matching = meds.find((m) => q.includes(m.name.toLowerCase()));
  if (matching) {
    return {
      text: `💊 **${matching.name} (${matching.dosage}):**\n\n• **Prescription Dosage:** ${matching.dosage}\n• **Instructions:** ${matching.instructions || 'Take with water'}\n• **Pills Remaining:** ${matching.pillsLeft} of ${matching.totalPills}`,
      quickReplies: ['My schedule', 'Food advice'],
    };
  }

  return {
    text: `🤖 **MediRem Health Assistant:**\n\nI received your question about **"${userQuery}"**.\n\nYou currently have **${meds.length}** medication(s) in your regimen. How can I help you regarding your schedules, doses, or alarms?`,
    quickReplies: ['My schedule', 'Pills left', 'Missed dose rule'],
  };
}

function LinearBotIcon() {
  return (
    <View style={styles.botIconWrapper}>
      <MaterialCommunityIcons name="robot" size={24} color="#FFFFFF" />
    </View>
  );
}

function FormattedText({ text, isAi }: { text: string; isAi: boolean }) {
  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <View key={idx} style={{ height: 6 }} />;
        }

        const parts = line.split(/(\*\*.*?\*\*)/g);

        return (
          <Text
            key={idx}
            style={[
              styles.messageText,
              isAi ? styles.messageTextAi : styles.messageTextUser,
              line.startsWith('•') && styles.bulletLine,
            ]}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <Text key={pIdx} style={styles.boldText}>
                    {part.slice(2, -2)}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botAvatar: {
    position: 'relative',
  },
  botIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#208AEF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  chipText: {
    fontSize: 12,
    color: '#208AEF',
    fontWeight: '600',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 10,
    maxWidth: '88%',
  },
  messageRowAi: {
    alignSelf: 'flex-start',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  msgAvatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: '#208AEF',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextAi: {
    color: '#1E293B',
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  boldText: {
    fontWeight: '800',
  },
  bulletLine: {
    paddingLeft: 4,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  timestamp: {
    fontSize: 10,
  },
  timestampAi: {
    color: '#94A3B8',
  },
  timestampUser: {
    color: '#BFDBFE',
    alignSelf: 'flex-end',
  },
  aiSourceText: {
    fontSize: 9,
    color: '#059669',
    fontWeight: '700',
  },
  quickRepliesBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickReplyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  quickReplyText: {
    fontSize: 11,
    color: '#208AEF',
    fontWeight: '600',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#208AEF',
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
  medicalDisclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginTop: 8,
  },
  medicalDisclaimerText: {
    flex: 1,
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#F1F5F9',
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0F172A',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
