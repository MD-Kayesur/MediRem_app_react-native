import React, { useState, useRef, useEffect } from 'react';
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

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  category?: string;
  quickReplies?: string[];
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    sender: 'ai',
    text: "Hello! 👋 I'm your **MediRem AI Assistant**.\n\nI can help you with medication schedules, side effects, drug interactions, food advice, and what to do if you miss a dose.\n\nHow can I help you today?",
    timestamp: 'Just now',
    quickReplies: [
      '💊 Metformin with food?',
      '⏰ Missed dose advice',
      '⚠️ Check interactions',
      '💧 Vitamin D3 timing',
    ],
  },
];

const SUGGESTION_CHIPS = [
  { label: '💊 Metformin advice', query: 'When and how should I take Metformin?' },
  { label: '⏰ Missed dose', query: 'What should I do if I miss a scheduled medication dose?' },
  { label: '⚠️ Drug interactions', query: 'Can I take Paracetamol and Metformin together?' },
  { label: '💧 Vitamin D3', query: 'What is the best time and way to take Vitamin D3?' },
  { label: '🍎 Foods to avoid', query: 'What foods or drinks should I avoid with Atorvastatin?' },
  { label: '🔔 Alarm features', query: 'How does MediRem loud alarm and 3-minute repeat work?' },
];

function getBotResponse(userQuery: string): { text: string; quickReplies?: string[] } {
  const query = userQuery.toLowerCase().trim();

  if (query.includes('metformin')) {
    return {
      text: "💊 **Metformin (Glucophage) Guide:**\n\n• **Best Timing:** Take with or right after your main meals (lunch or dinner). This significantly reduces stomach upset or nausea.\n• **Form:** If taking extended-release (XR), swallow whole—never crush or chew it.\n• **Alcohol:** Avoid heavy alcohol use as it increases lactic acidosis risk.\n• **Missed Dose:** Take as soon as you remember with a meal. If close to your next dose, skip it. Never double up!",
      quickReplies: ['Check Metformin side effects', 'Foods to avoid with Metformin'],
    };
  }

  if (query.includes('paracetamol') || query.includes('napa') || query.includes('acetaminophen') || query.includes('panadol')) {
    return {
      text: "💊 **Paracetamol (Acetaminophen / Napa) Guide:**\n\n• **Usage:** Relieves mild-to-moderate pain and reduces fever.\n• **Safe Dosage:** 500mg to 1000mg per dose, every 4 to 6 hours as needed.\n• **Maximum Limit:** **Never exceed 4,000mg (8 x 500mg tablets)** in 24 hours to prevent severe liver damage.\n• **Food:** Can be taken with or without food.\n• **Caution:** Check other cold/cough remedies to ensure you aren't unintentionally doubling acetaminophen.",
      quickReplies: ['Can I take with food?', 'What if fever persists?'],
    };
  }

  if (query.includes('vitamin d') || query.includes('d3')) {
    return {
      text: "☀️ **Vitamin D3 (Cholecalciferol) Guide:**\n\n• **Best Timing:** Take in the morning or early afternoon with a meal that contains healthy dietary fats (e.g. eggs, yogurt, nuts, or avocado).\n• **Why with fat?** Vitamin D3 is fat-soluble; taking it with dietary fat boosts absorption by up to 50%!\n• **Bedtime:** Avoid taking very late in the evening as some people report it interferes with melatonin and sleep.",
      quickReplies: ['Calcium and Vitamin D3', 'Weekly vs Daily dose'],
    };
  }

  if (query.includes('atorvastatin') || query.includes('lipitor') || query.includes('statin') || query.includes('cholesterol')) {
    return {
      text: "💊 **Atorvastatin (Lipitor) Guide:**\n\n• **Best Timing:** Usually taken once daily in the evening or at bedtime, when your liver synthesizes the most cholesterol.\n• **Grapefruit Warning:** ⚠️ Avoid drinking large amounts of grapefruit juice, as it can dangerously increase the medication level in your blood.\n• **Routine:** Can be taken with or without food.\n• **Doctor alert:** Let your doctor know promptly if you experience unexplained muscle pain or tenderness.",
      quickReplies: ['Common side effects', 'Foods to lower cholesterol'],
    };
  }

  if (query.includes('miss') || query.includes('forgot') || query.includes('late')) {
    return {
      text: "⏰ **What to Do If You Miss a Dose:**\n\n1. **Take it now:** If you just remembered and your next scheduled dose is several hours away, take your dose immediately.\n2. **Skip if close:** If it is almost time for your next regular dose, skip the missed dose and resume your normal schedule.\n3. **⚠️ NEVER Double Dose:** Never take two doses at the same time to compensate.\n4. **MediRem Alarms:** Keep the MediRem alarm enabled in the Meds tab so the loud 1-minute alert sounds automatically at your scheduled time.",
      quickReplies: ['How to set alarm', 'Check my routine'],
    };
  }

  if (query.includes('interact') || query.includes('together') || query.includes('mix')) {
    return {
      text: "🔍 **Drug Interaction Checker:**\n\n• **Metformin + Paracetamol:** Generally safe when taken at recommended doses.\n• **Paracetamol + Vitamin D3:** Safe; no known interactions.\n• **Metformin + Alcohol:** ⚠️ Avoid alcohol, as it increases lactic acidosis risk.\n• **Atorvastatin + Grapefruit:** ⚠️ Avoid grapefruit products.\n\n*Always inform your doctor or pharmacist of all prescription and OTC medicines you take.*",
      quickReplies: ['Metformin interactions', 'Painkiller safety'],
    };
  }

  if (query.includes('alarm') || query.includes('repeat') || query.includes('snooze') || query.includes('sound') || query.includes('ring')) {
    return {
      text: "🔔 **MediRem Alarm System Features:**\n\n• **Loud 1-Minute Ringing:** Rings continuously for 60 seconds with vibration when your dose time arrives.\n• **3-Minute Persistent Repeat:** If you don't take the dose, MediRem automatically sounds the alarm again every 3 minutes.\n• **Permanent Stop:** Tapping 'Take Dose' or 'Stop Alarm' permanently silences the alarm for today so it will not bother you again until tomorrow's dose.\n• **Test Alarm:** You can test the alarm anytime from the Meds tab!",
      quickReplies: ['How to add a medication', 'Snooze settings'],
    };
  }

  if (query.includes('side effect') || query.includes('allergy') || query.includes('dizzy') || query.includes('nausea')) {
    return {
      text: "⚠️ **Managing Medication Side Effects:**\n\n• **Common Mild Effects:** Mild stomach upset or light nausea often subsides after a few days as your body adapts. Taking medicine with food frequently helps.\n• **🚨 Emergency Warning Signs:** Seek emergency medical care immediately if you experience:\n  - Swelling of lips, face, or throat\n  - Difficulty breathing or wheezing\n  - Severe skin rash, hives, or blistering\n  - Severe chest pain or sudden weakness",
      quickReplies: ['When to call a doctor', 'Food and stomach upset'],
    };
  }

  if (query.includes('food') || query.includes('eat') || query.includes('water') || query.includes('empty stomach')) {
    return {
      text: "🍎 **Food & Medication Best Practices:**\n\n• **With Food:** Metformin, Aspirin, Ibuprofen, and Multivitamins (prevents stomach irritation).\n• **Empty Stomach (1h before or 2h after food):** Certain antibiotics (like Ampicillin) and Thyroid medications (Levothyroxine).\n• **With Water:** Always swallow pills with a full 8oz (250ml) glass of room-temperature water to ensure smooth passage into the stomach.\n• **Avoid:** Never wash down pills with hot coffee, carbonated sodas, or alcohol.",
      quickReplies: ['Vitamin D3 timing', 'Missed dose advice'],
    };
  }

  // Friendly Fallback
  return {
    text: `🤖 **MediRem Health Assistant:**\n\nThank you for asking about **"${userQuery}"**!\n\nHere are core medication safety guidelines:\n\n• **Exact Schedule:** Take medications at the exact same hour every day.\n• **Hydration:** Always take pills with a full glass of water.\n• **Proper Storage:** Store in a cool, dry place away from heat, direct sun, and moisture.\n• **Professional Advice:** For specific dosage adjustments, laboratory test results, or new symptoms, always consult your physician or licensed pharmacist.`,
    quickReplies: [
      '💊 Metformin advice',
      '⏰ Missed dose rule',
      '⚠️ Drug interactions',
    ],
  };
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
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // Pulse animation for green online dot
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
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Scroll to bottom when messages update
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: createUniqueId('user'),
      sender: 'user',
      text,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Realistic bot response delay (600ms)
    setTimeout(() => {
      const response = getBotResponse(text);
      const aiMsg: ChatMessage = {
        id: createUniqueId('ai'),
        sender: 'ai',
        text: response.text,
        timestamp: getFormattedTime(),
        quickReplies: response.quickReplies,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 650);
  };

  const handleClearChat = () => {
    Alert.alert(
      'Reset Conversation?',
      'Are you sure you want to clear this chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => setMessages(INITIAL_MESSAGES),
        },
      ]
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
            <Text style={styles.headerSubtitle}>24/7 Smart Medication Guide</Text>
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
          {SUGGESTION_CHIPS.map((chip, idx) => (
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
        {messages.map((msg) => {
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

                {/* Timestamp */}
                <Text
                  style={[
                    styles.timestamp,
                    isAi ? styles.timestampAi : styles.timestampUser,
                  ]}>
                  {msg.timestamp}
                </Text>

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
              <Text style={styles.typingText}>MediRem AI is thinking...</Text>
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
            Informational advice only. In emergencies or severe symptoms, always contact a healthcare professional.
          </Text>
        </View>
      </ScrollView>

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.inputArea}>
          <TextInput
            placeholder="Ask about medications, doses, timing..."
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
            <Ionicons
              name="arrow-up"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LinearBotIcon() {
  return (
    <View style={styles.botIconWrapper}>
      <MaterialCommunityIcons name="robot" size={24} color="#FFFFFF" />
    </View>
  );
}

function FormattedText({ text, isAi }: { text: string; isAi: boolean }) {
  // Simple clean markdown-like bold and bullet point renderer
  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <View key={idx} style={{ height: 6 }} />;
        }

        // Bold parser
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
    width: 44,
    height: 44,
  },
  botIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
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
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#208AEF',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  msgAvatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F4FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 6,
  },
  bubbleUser: {
    backgroundColor: '#208AEF',
    borderTopRightRadius: 6,
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
    marginVertical: 1,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  timestampAi: {
    color: '#94A3B8',
  },
  timestampUser: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  quickRepliesBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  quickReplyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  quickReplyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#208AEF',
  },
  typingBubble: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  medicalDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
});
