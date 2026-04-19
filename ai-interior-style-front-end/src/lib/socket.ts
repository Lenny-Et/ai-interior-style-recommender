import { io, Socket } from 'socket.io-client';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(userId: string) {
    if (this.socket?.connected) {
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(socketUrl, {
      query: { userId },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('Socket connection error:', error);
      this.handleReconnect();
    });

    // Listen for backend notification events. Backend emits `new_notification` and `unread_count_updated`.
    this.socket.on('new_notification', (data: NotificationData) => {
      this.handleNotification(data);
    });

    this.socket.on('unread_count_updated', (payload: { count: number }) => {
      // Forward unread count updates as a custom event
      window.dispatchEvent(new CustomEvent('socket-unread-count', { detail: payload }));
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleNotification(data: any) {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('socket-notification', { detail: data }));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
