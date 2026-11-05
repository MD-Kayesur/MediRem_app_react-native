import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from '@/redux/api/apiSlice';

let socket: Socket | null = null;

/**
 * Derives the root backend URL from API base URL (stripping /api)
 */
export function getSocketServerUrl(): string {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace(/\/api\/?$/, '');
}

/**
 * Returns existing socket instance or initializes a new Socket.IO client
 */
export function getSocket(): Socket {
  if (!socket) {
    const url = getSocketServerUrl();
    console.log(`🔌 [Socket.IO] Connecting to: ${url}`);

    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log(`✅ [Socket.IO] Connected to backend! Socket ID: ${socket?.id}`);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`❌ [Socket.IO] Disconnected: ${reason}`);
    });

    socket.on('connect_error', (err) => {
      console.warn(`⚠️ [Socket.IO] Connection error: ${err.message}`);
    });
  }

  return socket;
}

/**
 * Join conversation thread room
 */
export function socketJoinThread(userId: string, role?: 'USER' | 'ADMIN') {
  const s = getSocket();
  if (s.connected) {
    s.emit('join_thread', { userId, role });
  } else {
    s.once('connect', () => {
      s.emit('join_thread', { userId, role });
    });
  }
}

/**
 * Leave conversation thread room
 */
export function socketLeaveThread(userId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('leave_thread', { userId });
  }
}

/**
 * Emit a support message via Socket.IO
 */
export function socketSendMessage(payload: {
  senderId: string;
  senderEmail?: string;
  message: string;
  userId?: string;
}) {
  const s = getSocket();
  s.emit('send_message', payload);
}

/**
 * Emit typing indicator
 */
export function socketEmitTyping(userId: string, name: string, role: 'USER' | 'ADMIN') {
  const s = getSocket();
  if (s.connected) {
    s.emit('typing', { userId, name, role });
  }
}

export function socketEmitStopTyping(userId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('stop_typing', { userId });
  }
}

/**
 * Disconnect socket cleanly
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

