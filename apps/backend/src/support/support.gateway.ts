import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SupportService } from './support.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class SupportGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);

  constructor(private readonly supportService: SupportService) {}

  afterInit(server: Server) {
    this.logger.log('🔌 Socket.IO Support Gateway Initialized on root server');
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected to Socket.IO: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected from Socket.IO: ${client.id}`);
  }

  /**
   * User or Admin joins a conversation thread room
   */
  @SubscribeMessage('join_thread')
  handleJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; role?: 'USER' | 'ADMIN' },
  ) {
    if (!payload?.userId) return;

    const roomName = `thread_${payload.userId}`;
    client.join(roomName);
    this.logger.log(`👤 Client ${client.id} (${payload.role || 'USER'}) joined room: ${roomName}`);

    if (payload.role === 'ADMIN') {
      client.join('admin_desk');
      this.logger.log(`🛡️ Admin ${client.id} joined admin_desk room`);
    }

    client.emit('joined_thread', { room: roomName, success: true });
  }

  /**
   * Leave thread room
   */
  @SubscribeMessage('leave_thread')
  handleLeaveThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    if (!payload?.userId) return;
    const roomName = `thread_${payload.userId}`;
    client.leave(roomName);
    this.logger.log(`Client ${client.id} left room: ${roomName}`);
  }

  /**
   * Handle real-time support message:
   * 1. Saves message to Neon PostgreSQL via SupportService.
   * 2. Broadcasts `new_message` to the thread room in real time.
   * 3. Broadcasts `thread_updated` to all connected Admins.
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      senderId: string;
      senderEmail?: string;
      message: string;
      userId?: string; // Thread owner (required if Admin replying)
    },
  ) {
    try {
      if (!payload?.message?.trim() || !payload?.senderId) {
        client.emit('message_error', { error: 'Message content and sender ID are required.' });
        return;
      }

      const result = await this.supportService.sendMessage(
        payload.senderId,
        payload.senderEmail,
        {
          message: payload.message,
          userId: payload.userId,
        },
      );

      const savedMsg = result.data;
      const roomName = `thread_${savedMsg.userId}`;

      // 1. Broadcast to everyone currently viewing this thread room
      this.server.to(roomName).emit('new_message', savedMsg);

      // 2. Also emit to sender socket directly in case they aren't in room
      client.emit('message_sent', savedMsg);

      // 3. Notify all connected Admins in the admin desk
      this.server.to('admin_desk').emit('thread_updated', {
        userId: savedMsg.userId,
        lastMessage: savedMsg,
      });

      this.logger.log(
        `⚡ [Socket.IO] Broadcasted new message to room ${roomName} from ${savedMsg.senderRole} ${savedMsg.senderName}`,
      );
    } catch (err: any) {
      this.logger.error(`[Socket.IO] Failed to process send_message: ${err.message}`);
      client.emit('message_error', { error: err.message || 'Failed to send message.' });
    }
  }

  /**
   * Real-time typing indicators
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; name: string; role: 'USER' | 'ADMIN' },
  ) {
    if (!payload?.userId) return;
    client.to(`thread_${payload.userId}`).emit('user_typing', {
      name: payload.name,
      role: payload.role,
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    if (!payload?.userId) return;
    client.to(`thread_${payload.userId}`).emit('user_stop_typing', {});
  }
}

