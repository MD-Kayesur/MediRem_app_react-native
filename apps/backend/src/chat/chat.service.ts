import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ChatMessageDto, ChatHistoryItem } from './dto/chat-message.dto';

export interface ChatResponse {
  text: string;
  quickReplies: string[];
  userMedsCount: number;
  provider: string;
  isLiveAi: boolean;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Strictly resolve user ID from parameter or email to ensure database isolation
   */
  private async resolveUser(userId?: string, userEmail?: string) {
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) return user;

      if (userId.includes('@')) {
        const userByEmail = await this.prisma.user.findFirst({
          where: { email: { equals: userId.trim(), mode: 'insensitive' } },
        });
        if (userByEmail) return userByEmail;
      }
    }

    if (userEmail) {
      const user = await this.prisma.user.findFirst({
        where: { email: { equals: userEmail.trim(), mode: 'insensitive' } },
      });
      if (user) return user;
    }

    return null;
  }

  /**
   * Main entry point: Process chat query with strict user database isolation
   */
  async processChat(
    dto: ChatMessageDto,
    headerUserId?: string,
    headerUserEmail?: string,
  ): Promise<ChatResponse> {
    const targetUserId = dto.userId || headerUserId;
    const targetUserEmail = dto.userEmail || headerUserEmail;

    const user = await this.resolveUser(targetUserId, targetUserEmail);

    // Fetch ONLY this user's medications from Neon Database
    const userMeds = user
      ? await this.prisma.medication.findMany({
          where: { userId: user.id },
          include: {
            doseLogs: {
              take: 5,
              orderBy: { takenAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const apiKey = this.config.get<string>('AI_API_KEY')?.trim();
    const provider = this.config.get<string>('AI_PROVIDER')?.toLowerCase().trim() || 'gemini';
    const model =
      this.config.get<string>('AI_MODEL')?.trim() ||
      (provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');

    // Build personalized system context strictly containing this user's data
    const patientContext = this.buildPatientContext(user, userMeds);

    // If API Key is configured in .env, call the real AI Agent!
    if (apiKey) {
      try {
        const aiReply = await this.callRealAi(
          provider,
          model,
          apiKey,
          patientContext,
          dto.message,
          dto.conversationHistory || [],
        );

        if (aiReply) {
          const quickReplies = this.generateDynamicChips(userMeds);
          return {
            text: aiReply,
            quickReplies,
            userMedsCount: userMeds.length,
            provider: `${provider}:${model}`,
            isLiveAi: true,
          };
        }
      } catch (err: any) {
        this.logger.error(`Live AI API Call failed (${provider}): ${err?.message || err}`);
        // Fallback smoothly to dynamic database engine
      }
    }

    // Dynamic Database-Driven Intelligent Response (Works 100% even before API key is added!)
    const dbResponse = this.generateDatabaseDrivenResponse(dto.message, user, userMeds);
    const quickReplies = this.generateDynamicChips(userMeds);

    return {
      text: dbResponse,
      quickReplies,
      userMedsCount: userMeds.length,
      provider: apiKey ? `${provider} (fallback)` : 'database-engine',
      isLiveAi: false,
    };
  }

  /**
   * Build isolated patient context strictly from Neon PostgreSQL rows
   */
  private buildPatientContext(user: any, meds: any[]): string {
    const userName = user?.name || 'Patient';
    const userEmail = user?.email || 'N/A';

    let medsListStr = '';
    if (meds.length === 0) {
      medsListStr = 'No active medications currently registered in database.';
    } else {
      medsListStr = meds
        .map((m, idx) => {
          let timesStr = m.time || m.timeSlot || 'Scheduled';
          if (m.times) {
            try {
              const parsed = JSON.parse(m.times);
              if (Array.isArray(parsed) && parsed.length > 0) {
                timesStr = parsed.map((p) => `${p.slot} (${p.time})`).join(', ');
              }
            } catch {
              // fallback
            }
          }

          return `${idx + 1}. **${m.name}**
   - Dosage: ${m.dosage}
   - Instructions: ${m.instructions || 'Take as directed'}
   - Frequency: ${m.frequency || 'Every day'}
   - Scheduled Time(s): ${timesStr}
   - Inventory: ${m.pillsLeft} of ${m.totalPills} pills left (${m.pillsLeft <= 5 ? '⚠️ LOW STOCK' : 'In stock'})
   - Status: ${m.status || 'active'}`;
        })
        .join('\n\n');
    }

    return `You are MediRem AI Assistant, a compassionate, highly precise clinical medication copilot.
You are interacting strictly with patient: "${userName}" (Email: ${userEmail}).

PATIENT CONFIDENTIAL CLINICAL DOSSIER (LIVE DATABASE):
${medsListStr}

CRITICAL OPERATIONAL RULES:
1. STRICT DATA ISOLATION: You have visibility ONLY into the patient dossier provided above. You have zero access to any other patient in existence. Never invent or mix in medications from anyone else.
2. PERSONALIZED ANSWERS: When the patient asks about their medications, schedule, dosage, stock, or instructions, answer strictly using their live database records above.
3. CLINICAL ACCURACY: Provide evidence-based medication safety advice (taking with meals, hydration, missed dose instructions, food/drug interactions).
4. REFILL REMINDERS: If any of their medications have low pills left (<= 5), remind them gently to refill.
5. URGENCY: If the user mentions emergency symptoms (severe chest pain, breathing difficulty, swelling), urge them to dial emergency services immediately.`;
  }

  /**
   * Call Real AI Model (Google Gemini, OpenAI, or Neon AI Gateway)
   */
  private async callRealAi(
    provider: string,
    model: string,
    apiKey: string,
    systemContext: string,
    userQuery: string,
    history: ChatHistoryItem[],
  ): Promise<string | null> {
    // 1. Google Gemini Provider
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents: any[] = [];

      // Add recent history for conversational flow
      if (history && history.length > 0) {
        history.slice(-6).forEach((h) => {
          contents.push({
            role: h.sender === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }],
          });
        });
      }

      // Add current message with system instructions
      contents.push({
        role: 'user',
        parts: [
          {
            text: `[SYSTEM CONTEXT]\n${systemContext}\n\n[PATIENT QUESTION]\n${userQuery}`,
          },
        ],
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API error (${res.status}): ${errorText}`);
      }

      const json = await res.json();
      const answer = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      return answer ? answer.trim() : null;
    }

    // 2. OpenAI / Neon AI Gateway Provider
    const baseUrl =
      this.config.get<string>('AI_BASE_URL')?.trim() || 'https://api.openai.com/v1';
    const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const messages: any[] = [{ role: 'system', content: systemContext }];

    if (history && history.length > 0) {
      history.slice(-6).forEach((h) => {
        messages.push({
          role: h.sender === 'user' ? 'user' : 'assistant',
          content: h.text,
        });
      });
    }

    messages.push({ role: 'user', content: userQuery });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errorText}`);
    }

    const json = await res.json();
    const answer = json?.choices?.[0]?.message?.content;
    return answer ? answer.trim() : null;
  }

  /**
   * Dynamic Database-Driven Response using Patient's Live PostgreSQL Records
   */
  private generateDatabaseDrivenResponse(userQuery: string, user: any, meds: any[]): string {
    const q = userQuery.toLowerCase().trim();
    const patientName = user?.name || 'Friend';

    // 1. Asking about their medications list / schedule
    if (
      q.includes('my med') ||
      q.includes('what med') ||
      q.includes('list') ||
      q.includes('schedule') ||
      q.includes('routine') ||
      q.includes('today') ||
      q.includes('what should i take')
    ) {
      if (meds.length === 0) {
        return `Hello **${patientName}**! 👋\n\nYou currently do not have any active medications registered in your MediRem account.\n\nYou can easily add your prescribed medications and set alarm times by tapping the **Meds** tab below!`;
      }

      const listStr = meds
        .map((m) => {
          let timeText = m.time || m.timeSlot || 'Scheduled';
          if (m.times) {
            try {
              const parsed = JSON.parse(m.times);
              if (Array.isArray(parsed) && parsed.length > 0) {
                timeText = parsed.map((p) => `${p.slot} (${p.time})`).join(', ');
              }
            } catch {
              // fallback
            }
          }
          return `• **${m.name}** (${m.dosage})\n  ⏰ **Time:** ${timeText}\n  📦 **Pills Left:** ${m.pillsLeft} of ${m.totalPills}${
            m.pillsLeft <= 5 ? ' ⚠️ *(Refill Needed)*' : ''
          }\n  📋 **Instructions:** ${m.instructions || 'Take with water'}`;
        })
        .join('\n\n');

      return `Hello **${patientName}**! Here is your live personal medication schedule from your database:\n\n${listStr}\n\n*MediRem will alert you with your loud alarm at each scheduled dose time!*`;
    }

    // 2. Asking about inventory, refill, or pill stock
    if (q.includes('pill') || q.includes('left') || q.includes('stock') || q.includes('refill') || q.includes('remaining')) {
      if (meds.length === 0) {
        return `You have no medications recorded in your inventory yet, **${patientName}**. Add them in the Meds tab to automatically track remaining pills.`;
      }

      const lowStock = meds.filter((m) => m.pillsLeft <= 5);
      const stockSummary = meds
        .map((m) => `• **${m.name}**: **${m.pillsLeft}** pills left (out of ${m.totalPills})`)
        .join('\n');

      let alertMsg = '';
      if (lowStock.length > 0) {
        alertMsg = `\n\n⚠️ **Refill Alert:** You have **${lowStock.length}** medication(s) running low: ${lowStock
          .map((m) => m.name)
          .join(', ')}. Please contact your pharmacy or doctor for a refill soon!`;
      } else {
        alertMsg = `\n\n✅ **Good news:** All your medications have sufficient inventory!`;
      }

      return `📦 **Live Inventory Status for ${patientName}:**\n\n${stockSummary}${alertMsg}`;
    }

    // 3. Asking about a specific medication in their database
    const matchingMed = meds.find(
      (m) =>
        q.includes(m.name.toLowerCase()) ||
        (m.name.toLowerCase().length > 3 && q.includes(m.name.toLowerCase().substring(0, 4))),
    );

    if (matchingMed) {
      let timeText = matchingMed.time || matchingMed.timeSlot || 'Daily';
      if (matchingMed.times) {
        try {
          const parsed = JSON.parse(matchingMed.times);
          if (Array.isArray(parsed) && parsed.length > 0) {
            timeText = parsed.map((p) => `${p.slot} (${p.time})`).join(', ');
          }
        } catch {
          // fallback
        }
      }

      return `💊 **${matchingMed.name} (${matchingMed.dosage}) - Your Schedule Details:**\n\n• **Prescription Dosage:** ${matchingMed.dosage}\n• **Scheduled Time:** ${timeText}\n• **Frequency:** ${matchingMed.frequency || 'Every day'}\n• **Instructions:** ${matchingMed.instructions || 'Take with a full glass of water'}\n• **Stock Remaining:** ${matchingMed.pillsLeft} pills\n\n💡 **Tip:** Always take ${matchingMed.name} at the exact same hour every day for optimal clinical effectiveness!`;
    }

    // 4. Clinical advice: Missed Dose
    if (q.includes('miss') || q.includes('forgot') || q.includes('skip')) {
      return `⏰ **What to Do If You Miss a Dose:**\n\n1. **Take it now:** If you just remembered and your next dose is hours away, take it immediately with a glass of water.\n2. **Skip if close:** If it is almost time for your next scheduled dose, skip the missed one and stay on your normal routine.\n3. **⚠️ NEVER Double Up:** Do not take a double dose to compensate for a missed one.\n4. **MediRem Alarm:** Make sure MediRem loud alarms are enabled in your Profile so you don't miss future doses!`;
    }

    // 5. Food & Hydration
    if (q.includes('food') || q.includes('eat') || q.includes('water') || q.includes('empty')) {
      return `🍎 **General Medication & Food Advice:**\n\n• **With Food:** Pain relievers, metformin, and vitamins are best taken with or right after food to protect your stomach lining.\n• **Hydration:** Always drink a full glass (250ml) of room-temperature water with every pill.\n• **Avoid:** Never wash down medications with alcohol, hot coffee, or carbonated soda.`;
    }

    // 6. Default Dynamic Response with User Context
    const userMedsPreview =
      meds.length > 0
        ? `You currently have **${meds.length}** medication(s) registered: ${meds.map((m) => m.name).join(', ')}.`
        : 'You do not have any medications added yet.';

    return `🤖 **MediRem Health Assistant:**\n\nThank you for asking, **${patientName}**! ${userMedsPreview}\n\nHow else can I assist you today with your medication timings, dosages, or refill reminders?`;
  }

  /**
   * Generate Dynamic Suggestion Chips based on Patient's Actual Medications
   */
  private generateDynamicChips(meds: any[]): string[] {
    const chips: string[] = [];

    if (meds.length > 0) {
      chips.push(`💊 My medication schedule`);
      chips.push(`📦 Check pills left`);
      // Add first med
      chips.push(`⏰ When to take ${meds[0].name}?`);
      if (meds.some((m) => m.pillsLeft <= 5)) {
        chips.push(`⚠️ Low stock refill status`);
      }
    } else {
      chips.push(`📋 How to add medications?`);
      chips.push(`⏰ Missed dose rule`);
      chips.push(`🍎 Food & medication rules`);
    }

    chips.push(`🔔 How MediRem alarm works`);
    return chips.slice(0, 4);
  }
}

