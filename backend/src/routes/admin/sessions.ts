import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { adminAuthMiddleware, requireRole } from '../../middleware/adminAuth.js';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['WAITING', 'ACTIVE', 'DECIDING', 'COMPLETED', 'EXPIRED', 'CANCELLED']).optional(),
  mode: z.enum(['SOLO', 'GROUP']).optional(),
  sortBy: z.enum(['createdAt', 'startedAt', 'completedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const adminSessionRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('preHandler', adminAuthMiddleware);

  // GET /admin/sessions - List sessions with pagination
  fastify.get('/', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const skip = (query.page - 1) * query.limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.mode) {
      where.mode = query.mode;
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = query.fromDate;
      if (query.toDate) where.createdAt.lte = query.toDate;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              pictureUrl: true,
            },
          },
          _count: {
            select: { members: true, swipes: true },
          },
        },
      }),
      prisma.session.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        sessions,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
    });
  });

  // GET /admin/sessions/:id - Get session details
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            pictureUrl: true,
            lineUserId: true,
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
        decisions: {
          include: {
            menu: {
              select: {
                id: true,
                name: true,
                cuisineType: true,
              },
            },
            restaurant: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        _count: {
          select: { swipes: true, matches: true },
        },
      },
    });

    if (!session) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    return reply.send({
      success: true,
      data: { session },
    });
  });

  // GET /admin/sessions/:id/swipes - Get swipes for a session
  fastify.get('/:id/swipes', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(50),
    }).parse(request.query);

    const skip = (query.page - 1) * query.limit;

    const [swipes, total] = await Promise.all([
      prisma.swipe.findMany({
        where: { sessionId: id },
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
          menu: {
            select: {
              id: true,
              name: true,
            },
          },
          restaurant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.swipe.count({ where: { sessionId: id } }),
    ]);

    return reply.send({
      success: true,
      data: {
        swipes,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
    });
  });

  // PATCH /admin/sessions/:id/status - Update session status
  fastify.patch('/:id/status', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };
    const body = z.object({
      status: z.enum(['WAITING', 'ACTIVE', 'DECIDING', 'COMPLETED', 'EXPIRED', 'CANCELLED']),
    }).parse(request.body);

    const session = await prisma.session.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.status === 'COMPLETED' && { completedAt: new Date() }),
        ...(body.status === 'ACTIVE' && { startedAt: new Date() }),
      },
    });

    return reply.send({
      success: true,
      data: { session },
    });
  });

  // DELETE /admin/sessions/:id - Delete session
  fastify.delete('/:id', async (request, reply) => {
    await requireRole('SUPER_ADMIN')(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };

    await prisma.session.delete({
      where: { id },
    });

    return reply.send({
      success: true,
      message: 'Session deleted successfully',
    });
  });

  // GET /admin/sessions/stats - Get session statistics
  fastify.get('/stats/overview', async (_request, reply) => {
    const [
      totalSessions,
      activeSessions,
      completedSessions,
      todaySessions,
      avgMembersPerSession,
    ] = await Promise.all([
      prisma.session.count(),
      prisma.session.count({ where: { status: 'ACTIVE' } }),
      prisma.session.count({ where: { status: 'COMPLETED' } }),
      prisma.session.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.sessionMember.groupBy({
        by: ['sessionId'],
        _count: true,
      }).then((groups) => {
        if (groups.length === 0) return 0;
        const total = groups.reduce((acc, g) => acc + g._count, 0);
        return total / groups.length;
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        totalSessions,
        activeSessions,
        completedSessions,
        todaySessions,
        avgMembersPerSession: Math.round(avgMembersPerSession * 100) / 100,
      },
    });
  });
};
