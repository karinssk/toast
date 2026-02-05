import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const eventSchema = z.object({
  eventType: z.string().min(1).max(100),
  sessionId: z.string().optional(),
  payload: z.record(z.unknown()).default({}),
  clientTimestamp: z.string().datetime().optional(),
  deviceInfo: z.object({
    platform: z.enum(['ios', 'android', 'web']).optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
    liffVersion: z.string().optional(),
    screenWidth: z.number().optional(),
    screenHeight: z.number().optional(),
    locale: z.string().optional(),
  }).optional(),
});

const batchEventsSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
});

export async function analyticsRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authMiddleware);

  // POST /analytics/events - Track a single analytics event
  fastify.post('/events', async (request, reply) => {
    const user = request.user!;

    try {
      const body = eventSchema.parse(request.body);

      const event = await prisma.analyticsEvent.create({
        data: {
          eventType: body.eventType,
          sessionId: body.sessionId,
          userId: user.id,
          payload: body.payload,
          clientTimestamp: body.clientTimestamp ? new Date(body.clientTimestamp) : null,
          deviceInfo: body.deviceInfo || null,
        },
      });

      return reply.status(202).send({
        success: true,
        data: {
          eventId: event.id,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid event data',
          },
        });
      }
      throw error;
    }
  });

  // POST /analytics/events/batch - Track multiple analytics events at once
  fastify.post('/events/batch', async (request, reply) => {
    const user = request.user!;

    try {
      const body = batchEventsSchema.parse(request.body);

      let recorded = 0;
      let failed = 0;

      // Use transaction for batch insert
      await prisma.$transaction(async (tx) => {
        for (const event of body.events) {
          try {
            await tx.analyticsEvent.create({
              data: {
                eventType: event.eventType,
                sessionId: event.sessionId,
                userId: user.id,
                payload: event.payload,
                clientTimestamp: event.clientTimestamp ? new Date(event.clientTimestamp) : null,
                deviceInfo: event.deviceInfo || null,
              },
            });
            recorded++;
          } catch (err) {
            console.error('Failed to record event:', err);
            failed++;
          }
        }
      });

      return reply.status(202).send({
        success: true,
        data: {
          recorded,
          failed,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid events data',
          },
        });
      }
      throw error;
    }
  });
}
