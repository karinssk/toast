import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { redis, RedisKeys, RedisTTL } from '../lib/redis.js';
import { env } from '../config/env.js';
import { handleSwipe, checkForMatch } from './handlers/swipe.js';
import { MemberStatus, SessionStatus } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    displayName: string;
    pictureUrl: string | null;
  };
}

export function setupSocketIO(io: Server) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          displayName: true,
          pictureUrl: true,
        },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Update presence
    updatePresence(socket.userId!);

    // Handle room join
    socket.on('room:join', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;

        // Verify membership
        const member = await prisma.sessionMember.findUnique({
          where: {
            sessionId_userId: {
              sessionId,
              userId: socket.userId!,
            },
          },
          include: {
            session: {
              include: {
                owner: {
                  select: {
                    id: true,
                    displayName: true,
                    pictureUrl: true,
                  },
                },
                members: {
                  where: { status: { not: MemberStatus.REMOVED } },
                  include: {
                    user: {
                      select: {
                        id: true,
                        displayName: true,
                        pictureUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!member) {
          socket.emit('room:error', {
            code: 'NOT_A_MEMBER',
            message: 'You are not a member of this session',
          });
          return;
        }

        // Join socket room
        socket.join(`session:${sessionId}`);

        // Store user's current room in Redis
        await redis.setex(
          RedisKeys.userCurrentRoom(socket.userId!),
          RedisTTL.ROOM_STATE,
          sessionId
        );

        // Update member's last active time
        await prisma.sessionMember.update({
          where: { id: member.id },
          data: { lastActiveAt: new Date(), status: MemberStatus.ACTIVE },
        });

        // Get deck if session is active
        let deck = null;
        if (member.session.status === SessionStatus.ACTIVE) {
          const deckData = await redis.get(RedisKeys.roomDeck(sessionId, 'menu_swipe'));
          if (deckData) {
            deck = JSON.parse(deckData);
          }
        }

        // Send room state to the joining user
        socket.emit('room:state', {
          sessionId,
          code: member.session.code,
          status: member.session.status,
          phase: member.session.phase,
          mode: member.session.mode,
          owner: {
            userId: member.session.owner.id,
            displayName: member.session.owner.displayName,
            pictureUrl: member.session.owner.pictureUrl,
            status: MemberStatus.ACTIVE,
            progress: 0,
            isOwner: true,
          },
          members: member.session.members.map((m) => ({
            userId: m.user.id,
            displayName: m.user.displayName,
            pictureUrl: m.user.pictureUrl,
            status: m.status,
            progress: m.menuSwipeIndex,
            isOwner: m.userId === member.session.ownerId,
          })),
          filters: member.session.filters,
          deck,
        });

        // Notify others that user joined
        socket.to(`session:${sessionId}`).emit('member:joined', {
          sessionId,
          member: {
            userId: socket.user!.id,
            displayName: socket.user!.displayName,
            pictureUrl: socket.user!.pictureUrl,
            status: MemberStatus.ACTIVE,
            progress: member.menuSwipeIndex,
            isOwner: socket.userId === member.session.ownerId,
          },
        });

        console.log(`User ${socket.userId} joined room ${sessionId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('room:error', {
          code: 'JOIN_FAILED',
          message: 'Failed to join room',
        });
      }
    });

    // Handle room leave
    socket.on('room:leave', async (data: { sessionId: string }) => {
      const { sessionId } = data;

      socket.leave(`session:${sessionId}`);
      await redis.del(RedisKeys.userCurrentRoom(socket.userId!));

      socket.to(`session:${sessionId}`).emit('member:left', {
        sessionId,
        userId: socket.userId,
        reason: 'disconnected',
      });

      console.log(`User ${socket.userId} left room ${sessionId}`);
    });

    // Handle swipe submission
    socket.on('swipe:submit', async (data: {
      sessionId: string;
      itemId: string;
      direction: 'LEFT' | 'RIGHT' | 'UP';
      durationMs: number;
    }) => {
      try {
        const result = await handleSwipe(socket.userId!, data);

        // Acknowledge swipe
        socket.emit('swipe:ack', {
          itemId: data.itemId,
          recorded: true,
        });

        // Broadcast progress to room
        io.to(`session:${data.sessionId}`).emit('swipe:progress', {
          sessionId: data.sessionId,
          totalCards: result.totalCards,
          memberProgress: result.memberProgress,
        });

        // Check if we should compute a match
        if (result.shouldCheckMatch) {
          const matchResult = await checkForMatch(data.sessionId, io);
          if (matchResult) {
            console.log(`Match found in session ${data.sessionId}:`, matchResult);
          }
        }
      } catch (error) {
        console.error('Error processing swipe:', error);
        socket.emit('swipe:ack', {
          itemId: data.itemId,
          recorded: false,
          error: 'Failed to process swipe',
        });
      }
    });

    // Handle phase:continue - transition from menu result to restaurant swipe
    socket.on('phase:continue', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;

        const session = await prisma.session.findUnique({
          where: { id: sessionId },
        });

        if (!session) return;

        // Transition from MENU_RESULT to RESTAURANT_SWIPE
        if (session.phase === 'MENU_RESULT') {
          await prisma.session.update({
            where: { id: sessionId },
            data: { phase: 'RESTAURANT_SWIPE' },
          });

          // Get restaurant deck from Redis
          const deckData = await redis.get(RedisKeys.roomDeck(sessionId, 'restaurant_swipe'));
          const deck = deckData ? JSON.parse(deckData) : [];

          // Notify all members in the room
          io.to(`session:${sessionId}`).emit('phase:transition', {
            sessionId,
            fromPhase: 'MENU_RESULT',
            toPhase: 'RESTAURANT_SWIPE',
            data: { deck },
          });

          console.log(`Session ${sessionId} transitioned to RESTAURANT_SWIPE with ${deck.length} restaurants`);
        }
      } catch (error) {
        console.error('Error handling phase:continue:', error);
      }
    });

    // Handle presence ping
    socket.on('presence:ping', () => {
      updatePresence(socket.userId!);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);

      // Get user's current room
      const currentRoom = await redis.get(RedisKeys.userCurrentRoom(socket.userId!));

      if (currentRoom) {
        // Notify room of user going offline
        socket.to(`session:${currentRoom}`).emit('presence:update', {
          userId: socket.userId,
          status: 'offline',
        });
      }

      // Clear presence
      await redis.del(RedisKeys.userPresence(socket.userId!));
      await redis.del(RedisKeys.userCurrentRoom(socket.userId!));
    });
  });
}

async function updatePresence(userId: string) {
  await redis.setex(
    RedisKeys.userPresence(userId),
    RedisTTL.PRESENCE,
    JSON.stringify({ status: 'online', lastPing: Date.now() })
  );
}
