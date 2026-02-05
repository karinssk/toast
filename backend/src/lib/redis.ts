import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

// Redis key patterns
export const RedisKeys = {
  // User session token
  userSession: (userId: string) => `user:session:${userId}`,

  // Room/Session state
  roomState: (sessionId: string) => `room:${sessionId}:state`,
  roomMembers: (sessionId: string) => `room:${sessionId}:members`,
  roomSwipes: (sessionId: string, phase: string) => `room:${sessionId}:swipes:${phase}`,
  roomProgress: (sessionId: string) => `room:${sessionId}:progress`,

  // User presence
  userPresence: (userId: string) => `user:${userId}:presence`,
  userCurrentRoom: (userId: string) => `user:${userId}:room`,

  // Countdown timers
  roomCountdown: (sessionId: string) => `room:${sessionId}:countdown`,

  // Card deck (ordered set of cards for session)
  roomDeck: (sessionId: string, phase: string) => `room:${sessionId}:deck:${phase}`,

  // Rate limiting
  rateLimitSwipe: (userId: string) => `ratelimit:swipe:${userId}`,

  // Invite codes (for quick lookup)
  inviteCode: (code: string) => `invite:${code}`,
} as const;

// TTL values in seconds
export const RedisTTL = {
  USER_SESSION: 7 * 24 * 60 * 60,      // 7 days
  ROOM_STATE: 24 * 60 * 60,            // 24 hours
  PRESENCE: 30,                         // 30 seconds
  COMPLETED_ROOM: 60 * 60,             // 1 hour
  RATE_LIMIT_SWIPE: 1,                 // 1 second
  INVITE_CODE: 24 * 60 * 60,           // 24 hours
} as const;
