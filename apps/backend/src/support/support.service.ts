import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendSupportMessageDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to resolve active user by ID or email
   */
  async resolveUser(userId?: string, userEmail?: string) {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) return user;
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
   * Send a support message / bug report:
   * - User sends first message to report a bug or contact admin.
   * - Admin replies to the specific user thread.
   */
  async sendMessage(
    callerId: string,
    callerEmail: string | undefined,
    dto: SendSupportMessageDto,
  ) {
    const caller = await this.resolveUser(callerId, callerEmail);
    if (!caller) {
      throw new NotFoundException('Authenticated user not found.');
    }

    const messageText = dto.message?.trim();
    if (!messageText) {
      throw new BadRequestException('Message content cannot be empty.');
    }

    const isAdmin = caller.role === 'ADMIN';

    let threadUserId: string;

    if (isAdmin) {
      // Admin is replying to a user's conversation thread
      if (!dto.userId) {
        throw new BadRequestException('Target user ID (userId) is required when Admin replies.');
      }
      const targetUser = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (!targetUser) {
        throw new NotFoundException('Target user thread not found.');
      }
      threadUserId = targetUser.id;
    } else {
      // Regular user messaging their own support thread
      threadUserId = caller.id;
    }

    const created = await this.prisma.supportMessage.create({
      data: {
        userId: threadUserId,
        senderId: caller.id,
        senderRole: isAdmin ? 'ADMIN' : 'USER',
        senderName: caller.name || (isAdmin ? 'MediRem Support Admin' : 'User'),
        message: messageText,
        isRead: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(
      `💬 [Support Chat] ${isAdmin ? 'Admin' : 'User'} ${caller.name} (${caller.email}) sent message in thread ${threadUserId}`,
    );

    return {
      success: true,
      message: 'Support message sent successfully.',
      data: created,
    };
  }

  /**
   * Get all messages for a specific conversation thread (ordered chronologically)
   */
  async getThreadMessages(
    callerId: string,
    callerEmail: string | undefined,
    targetUserId?: string,
  ) {
    const caller = await this.resolveUser(callerId, callerEmail);
    if (!caller) {
      throw new NotFoundException('Authenticated user not found.');
    }

    const isAdmin = caller.role === 'ADMIN';

    // Normal users can only read their own thread; Admins can read any thread or their own
    const threadUserId = isAdmin && targetUserId ? targetUserId : caller.id;

    // 1. Mark incoming messages from the opposite party as read FIRST
    const oppositeRole = isAdmin ? 'USER' : 'ADMIN';
    await this.prisma.supportMessage.updateMany({
      where: {
        userId: threadUserId,
        senderRole: oppositeRole,
        isRead: false,
      },
      data: { isRead: true },
    });

    // 2. Fetch all messages in chronological order (now correctly showing isRead: true)
    const messages = await this.prisma.supportMessage.findMany({
      where: { userId: threadUserId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      threadUserId,
      total: messages.length,
      data: messages,
    };
  }

  /**
   * Real-time read receipt: mark all messages sent by opposite party as read
   */
  async markThreadAsRead(threadUserId: string, oppositeRole: 'USER' | 'ADMIN') {
    return this.prisma.supportMessage.updateMany({
      where: {
        userId: threadUserId,
        senderRole: oppositeRole,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  /**
   * Admin-only: Get all user support threads/conversations
   */
  async getAdminThreads(callerId: string, callerEmail?: string) {
    const caller = await this.resolveUser(callerId, callerEmail);
    if (!caller || caller.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can access all support threads.');
    }

    // Get all distinct thread user IDs
    const messages = await this.prisma.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Group by thread userId
    const threadMap = new Map<string, any>();

    for (const msg of messages) {
      if (!threadMap.has(msg.userId)) {
        threadMap.set(msg.userId, {
          userId: msg.userId,
          user: msg.user,
          lastMessage: msg,
          unreadCount: 0,
          totalMessages: 0,
        });
      }
      const item = threadMap.get(msg.userId);
      item.totalMessages += 1;
      if (msg.senderRole === 'USER' && !msg.isRead) {
        item.unreadCount += 1;
      }
    }

    const threads = Array.from(threadMap.values());

    return {
      success: true,
      total: threads.length,
      data: threads,
    };
  }

  /**
   * Get unread support badge counts
   */
  async getUnreadBadge(callerId: string, callerEmail?: string) {
    const caller = await this.resolveUser(callerId, callerEmail);
    if (!caller) return { success: true, unreadCount: 0 };

    if (caller.role === 'ADMIN') {
      const count = await this.prisma.supportMessage.count({
        where: { senderRole: 'USER', isRead: false },
      });
      return { success: true, role: 'ADMIN', unreadCount: count };
    }

    const count = await this.prisma.supportMessage.count({
      where: { userId: caller.id, senderRole: 'ADMIN', isRead: false },
    });
    return { success: true, role: 'USER', unreadCount: count };
  }
}

