import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { redis, RedisKeys, RedisTTL } from '../lib/redis.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateInviteCode, isValidInviteCode } from '../utils/invite-code.js';
import { SessionStatus, SessionPhase, MemberStatus } from '@prisma/client';

const createSessionSchema = z.object({
  mode: z.enum(['SOLO', 'GROUP']),
  filters: z.object({
    cuisines: z.array(z.string()).default([]),
    priceRange: z.tuple([z.number().min(1).max(4), z.number().min(1).max(4)]).default([1, 4]),
    maxDistance: z.number().min(100).max(50000).default(5000),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }).nullable().default(null),
  }).default({}),
});

const joinSessionSchema = z.object({
  code: z.string().length(6),
});

export async function sessionRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authMiddleware);

  // POST /sessions - Create a new session
  fastify.post('/', async (request, reply) => {
    const user = request.user!;

    try {
      const body = createSessionSchema.parse(request.body);

      // Generate unique invite code
      let code: string;
      let attempts = 0;
      do {
        code = generateInviteCode();
        const existing = await prisma.session.findUnique({ where: { code } });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'CODE_GENERATION_FAILED',
            message: 'Failed to generate unique invite code',
          },
        });
      }

      // Create session
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const session = await prisma.session.create({
        data: {
          code,
          mode: body.mode,
          status: body.mode === 'SOLO' ? SessionStatus.ACTIVE : SessionStatus.WAITING,
          phase: SessionPhase.MENU_SWIPE,
          filters: body.filters,
          ownerId: user.id,
          expiresAt,
          members: {
            create: {
              userId: user.id,
              status: MemberStatus.ACTIVE,
            },
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              pictureUrl: true,
            },
          },
          members: {
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
      });

      // Store invite code in Redis for quick lookup
      await redis.setex(
        RedisKeys.inviteCode(code),
        RedisTTL.INVITE_CODE,
        session.id
      );

      // Build invite URL (LIFF URL with session code)
      const liffId = process.env.LIFF_ID || 'your-liff-id';
      const inviteUrl = `https://liff.line.me/${liffId}?session=${code}`;

      return reply.status(201).send({
        success: true,
        data: {
          id: session.id,
          code: session.code,
          mode: session.mode,
          status: session.status,
          phase: session.phase,
          inviteUrl,
          expiresAt: session.expiresAt,
          owner: {
            id: session.owner.id,
            displayName: session.owner.displayName,
            pictureUrl: session.owner.pictureUrl,
            status: MemberStatus.ACTIVE,
            progress: 0,
            isOwner: true,
          },
          members: session.members.map((m) => ({
            userId: m.user.id,
            displayName: m.user.displayName,
            pictureUrl: m.user.pictureUrl,
            status: m.status,
            progress: 0,
            isOwner: m.userId === session.ownerId,
          })),
          filters: session.filters,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
          },
        });
      }
      throw error;
    }
  });

  // GET /sessions/:sessionId - Get session details
  fastify.get('/:sessionId', async (request, reply) => {
    const user = request.user!;
    const { sessionId } = request.params as { sessionId: string };

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
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
    });

    if (!session) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
        },
      });
    }

    // Check if user is a member
    const isMember = session.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'NOT_A_MEMBER',
          message: 'You are not a member of this session',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        id: session.id,
        code: session.code,
        mode: session.mode,
        status: session.status,
        phase: session.phase,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        startedAt: session.startedAt,
        owner: {
          id: session.owner.id,
          displayName: session.owner.displayName,
          pictureUrl: session.owner.pictureUrl,
          status: MemberStatus.ACTIVE,
          progress: 0,
          isOwner: true,
        },
        members: session.members.map((m) => ({
          userId: m.user.id,
          displayName: m.user.displayName,
          pictureUrl: m.user.pictureUrl,
          status: m.status,
          progress: m.menuSwipeIndex,
          isOwner: m.userId === session.ownerId,
        })),
        filters: session.filters,
      },
    });
  });

  // POST /sessions/join - Join a session via invite code
  fastify.post('/join', async (request, reply) => {
    const user = request.user!;

    try {
      const body = joinSessionSchema.parse(request.body);
      const code = body.code.toUpperCase();

      if (!isValidInviteCode(code)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: 'Invalid invite code format',
          },
        });
      }

      // Try to find session by code (check Redis first for speed)
      let sessionId = await redis.get(RedisKeys.inviteCode(code));

      const session = await prisma.session.findUnique({
        where: sessionId ? { id: sessionId } : { code },
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
      });

      if (!session) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Invalid or expired invite code',
          },
        });
      }

      // Check if session is joinable
      if (session.status !== SessionStatus.WAITING) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'SESSION_NOT_JOINABLE',
            message: 'This session is no longer accepting new members',
          },
        });
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'This session has expired',
          },
        });
      }

      // Check if already a member
      const existingMember = session.members.find((m) => m.userId === user.id);
      if (existingMember) {
        // Already a member, just return the session
        return reply.send({
          success: true,
          data: {
            sessionId: session.id,
            alreadyMember: true,
            session: formatSessionResponse(session),
          },
        });
      }

      // Check if session is full
      if (session.members.length >= session.maxMembers) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'SESSION_FULL',
            message: 'This session has reached maximum capacity',
          },
        });
      }

      // Add user as member
      await prisma.sessionMember.create({
        data: {
          sessionId: session.id,
          userId: user.id,
          status: MemberStatus.ACTIVE,
        },
      });

      // Fetch updated session
      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
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
      });

      // Emit socket event for member joined
      fastify.io.to(`session:${session.id}`).emit('member:joined', {
        sessionId: session.id,
        member: {
          userId: user.id,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          status: MemberStatus.ACTIVE,
          progress: 0,
          isOwner: false,
        },
      });

      return reply.send({
        success: true,
        data: {
          sessionId: session.id,
          alreadyMember: false,
          session: formatSessionResponse(updatedSession!),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
          },
        });
      }
      throw error;
    }
  });

  // POST /sessions/:sessionId/start - Start the session (owner only)
  fastify.post('/:sessionId/start', async (request, reply) => {
    const user = request.user!;
    const { sessionId } = request.params as { sessionId: string };

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        members: {
          where: { status: MemberStatus.ACTIVE },
        },
      },
    });

    if (!session) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
        },
      });
    }

    // Check if user is owner
    if (session.ownerId !== user.id) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'NOT_OWNER',
          message: 'Only the session owner can start the session',
        },
      });
    }

    // Check if session can be started
    if (session.status !== SessionStatus.WAITING) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Session has already started or ended',
        },
      });
    }

    // Get menu deck based on filters
    const filters = session.filters as { cuisines?: string[]; priceRange?: [number, number] };
    const menus = await prisma.menu.findMany({
      where: {
        isActive: true,
        ...(filters.cuisines?.length ? { cuisineType: { in: filters.cuisines } } : {}),
        // Skip price filtering for MVP - prices are in actual THB values
      },
      orderBy: { popularity: 'desc' },
      take: 20, // Limit deck size for MVP
    });

    console.log(`Found ${menus.length} menus for session ${sessionId}`);

    if (menus.length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'NO_MENUS',
          message: 'No menus match the selected filters',
        },
      });
    }

    // Update session status
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.ACTIVE,
        startedAt: new Date(),
      },
    });

    // Build deck response
    const deck = menus.map((menu) => ({
      id: menu.id,
      type: 'menu' as const,
      name: menu.name,
      nameLocal: menu.nameLocal,
      imageUrl: menu.imageUrl,
      description: menu.description,
      cuisineType: menu.cuisineType,
      priceRange: [menu.priceRangeLow, menu.priceRangeHigh] as [number, number],
      tags: menu.tags,
    }));

    // Store deck in Redis
    await redis.setex(
      RedisKeys.roomDeck(sessionId, 'menu_swipe'),
      RedisTTL.ROOM_STATE,
      JSON.stringify(deck)
    );

    // Emit socket event
    fastify.io.to(`session:${sessionId}`).emit('room:started', {
      sessionId,
      deck,
    });

    return reply.send({
      success: true,
      data: {
        sessionId,
        status: updatedSession.status,
        deck,
      },
    });
  });

  // POST /sessions/:sessionId/leave - Leave a session
  fastify.post('/:sessionId/leave', async (request, reply) => {
    const user = request.user!;
    const { sessionId } = request.params as { sessionId: string };

    const member = await prisma.sessionMember.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: user.id,
        },
      },
      include: {
        session: true,
      },
    });

    if (!member) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_A_MEMBER',
          message: 'You are not a member of this session',
        },
      });
    }

    // Update member status
    await prisma.sessionMember.update({
      where: { id: member.id },
      data: { status: MemberStatus.LEFT },
    });

    // Emit socket event
    fastify.io.to(`session:${sessionId}`).emit('member:left', {
      sessionId,
      userId: user.id,
      reason: 'left',
    });

    // If owner leaves, cancel the session (if still waiting)
    if (member.session.ownerId === user.id && member.session.status === SessionStatus.WAITING) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.CANCELLED },
      });
    }

    return reply.send({
      success: true,
      data: { left: true },
    });
  });

  // GET /sessions/:sessionId/result - Get final session result
  fastify.get('/:sessionId/result', async (request, reply) => {
    const user = request.user!;
    const { sessionId } = request.params as { sessionId: string };

    // Check membership
    const member = await prisma.sessionMember.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: user.id,
        },
      },
    });

    if (!member) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'NOT_A_MEMBER',
          message: 'You are not a member of this session',
        },
      });
    }

    // Get decision
    const decision = await prisma.decision.findFirst({
      where: { sessionId },
      include: {
        menu: true,
        restaurant: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!decision) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NO_DECISION',
          message: 'No decision has been made yet',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        sessionId,
        decision: {
          menu: decision.menu ? {
            id: decision.menu.id,
            name: decision.menu.name,
            nameLocal: decision.menu.nameLocal,
            imageUrl: decision.menu.imageUrl,
            cuisineType: decision.menu.cuisineType,
          } : null,
          restaurant: decision.restaurant ? {
            id: decision.restaurant.id,
            name: decision.restaurant.name,
            nameLocal: decision.restaurant.nameLocal,
            imageUrl: decision.restaurant.imageUrl,
            address: decision.restaurant.address,
            rating: decision.restaurant.rating,
            googleMapsUrl: decision.restaurant.googleMapsUrl,
          } : null,
          method: decision.method,
          confidence: decision.confidence,
          timeToDecisionMs: decision.timeToDecisionMs,
          votes: decision.voteBreakdown,
        },
      },
    });
  });
}

// Helper function to format session response
function formatSessionResponse(session: any) {
  return {
    id: session.id,
    code: session.code,
    mode: session.mode,
    status: session.status,
    phase: session.phase,
    expiresAt: session.expiresAt,
    owner: {
      id: session.owner.id,
      displayName: session.owner.displayName,
      pictureUrl: session.owner.pictureUrl,
      status: MemberStatus.ACTIVE,
      progress: 0,
      isOwner: true,
    },
    members: session.members.map((m: any) => ({
      userId: m.user.id,
      displayName: m.user.displayName,
      pictureUrl: m.user.pictureUrl,
      status: m.status,
      progress: m.menuSwipeIndex,
      isOwner: m.userId === session.ownerId,
    })),
    filters: session.filters,
  };
}
