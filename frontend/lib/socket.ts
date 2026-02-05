import { io, Socket } from 'socket.io-client';
import type {
  RoomStatePayload,
  MemberInfo,
  MatchFoundPayload,
  ProgressInfo,
  MenuInfo,
  RestaurantInfo,
  CardInfo,
} from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface ServerToClientEvents {
  'auth:success': (data: { userId: string; user: unknown }) => void;
  'auth:error': (data: { code: string; message: string }) => void;
  'room:state': (data: RoomStatePayload) => void;
  'room:joined': (data: { sessionId: string; member: MemberInfo }) => void;
  'room:left': (data: { sessionId: string; userId: string; reason: string }) => void;
  'room:started': (data: { sessionId: string; deck: CardInfo[] }) => void;
  'room:error': (data: { code: string; message: string }) => void;
  'member:joined': (data: { sessionId: string; member: MemberInfo }) => void;
  'member:left': (data: { sessionId: string; userId: string; reason: string }) => void;
  'member:idle': (data: { sessionId: string; userId: string }) => void;
  'member:removed': (data: { sessionId: string; userId: string; reason: string }) => void;
  'member:progress': (data: { sessionId: string; userId: string; progress: number }) => void;
  'swipe:ack': (data: { itemId: string; recorded: boolean; error?: string }) => void;
  'swipe:progress': (data: {
    sessionId: string;
    totalCards: number;
    memberProgress: Record<string, number>;
  }) => void;
  'match:found': (data: MatchFoundPayload) => void;
  'match:tie': (data: { sessionId: string; phase: string; tiedItems: Array<{ itemId: string; votes: number }> }) => void;
  'match:none': (data: { sessionId: string; phase: string; topItems: Array<{ itemId: string; score: number }> }) => void;
  'phase:transition': (data: { sessionId: string; fromPhase: string; toPhase: string; data: unknown }) => void;
  'phase:menu_result': (data: {
    sessionId: string;
    menu: MenuInfo | null;
    matchType: string;
    confidence: number;
    restaurants: RestaurantInfo[];
  }) => void;
  'phase:final_result': (data: {
    sessionId: string;
    menu: MenuInfo | null;
    restaurant: RestaurantInfo | null;
    decision: { method: string; confidence: number; timeToDecisionMs: number };
  }) => void;
  'countdown:start': (data: { sessionId: string; seconds: number; reason: string }) => void;
  'countdown:tick': (data: { sessionId: string; remaining: number }) => void;
  'countdown:end': (data: { sessionId: string; action: string }) => void;
  'presence:update': (data: { userId: string; status: 'online' | 'away' | 'offline' }) => void;
}

interface ClientToServerEvents {
  'auth:connect': (data: { token: string }) => void;
  'room:join': (data: { sessionId: string }) => void;
  'room:leave': (data: { sessionId: string }) => void;
  'room:start': (data: { sessionId: string }) => void;
  'swipe:submit': (data: {
    sessionId: string;
    itemId: string;
    direction: 'LEFT' | 'RIGHT' | 'UP';
    durationMs: number;
  }) => void;
  'presence:ping': () => void;
  'phase:ready': (data: { sessionId: string; phase: string }) => void;
  'phase:continue': (data: { sessionId: string }) => void;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketClient {
  private socket: TypedSocket | null = null;
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  connect(): TypedSocket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: this.token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    }) as TypedSocket;

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): TypedSocket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Room operations
  joinRoom(sessionId: string) {
    this.socket?.emit('room:join', { sessionId });
  }

  leaveRoom(sessionId: string) {
    this.socket?.emit('room:leave', { sessionId });
  }

  startRoom(sessionId: string) {
    this.socket?.emit('room:start', { sessionId });
  }

  // Swipe operations
  submitSwipe(data: {
    sessionId: string;
    itemId: string;
    direction: 'LEFT' | 'RIGHT' | 'UP';
    durationMs: number;
  }) {
    this.socket?.emit('swipe:submit', data);
  }

  // Presence
  ping() {
    this.socket?.emit('presence:ping');
  }

  // Phase operations
  readyForPhase(sessionId: string, phase: string) {
    this.socket?.emit('phase:ready', { sessionId, phase });
  }

  continueToNextPhase(sessionId: string) {
    this.socket?.emit('phase:continue', { sessionId });
  }

  // Event listeners
  on<K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ) {
    this.socket?.on(event, callback as (...args: unknown[]) => void);
  }

  off<K extends keyof ServerToClientEvents>(
    event: K,
    callback?: ServerToClientEvents[K]
  ) {
    if (callback) {
      this.socket?.off(event, callback as (...args: unknown[]) => void);
    } else {
      this.socket?.off(event);
    }
  }
}

export const socketClient = new SocketClient();
