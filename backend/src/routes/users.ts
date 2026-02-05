import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  preferences: z.object({
    cuisines: z.array(z.string()).optional(),
    priceRange: z.tuple([z.number().min(1).max(4), z.number().min(1).max(4)]).optional(),
    maxDistance: z.number().min(100).max(50000).optional(),
  }).optional(),
});

const onboardingSchema = z.object({
  step: z.number().min(0).max(3),
  completed: z.boolean().optional(),
});

export async function userRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authMiddleware);

  // GET /users/me - Get current user profile
  fastify.get('/me', async (request, reply) => {
    const authUser = request.user!;

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        id: user.id,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl,
        preferences: user.preferences,
        onboardingStep: user.onboardingStep,
        onboardingDone: user.onboardingDone,
        createdAt: user.createdAt,
      },
    });
  });

  // PATCH /users/me - Update user profile/preferences
  fastify.patch('/me', async (request, reply) => {
    const authUser = request.user!;

    try {
      const body = updateUserSchema.parse(request.body);

      const updateData: Record<string, unknown> = {};

      if (body.displayName) {
        updateData.displayName = body.displayName;
      }

      if (body.preferences) {
        // Merge with existing preferences
        const currentUser = await prisma.user.findUnique({
          where: { id: authUser.id },
        });

        const currentPrefs = (currentUser?.preferences as Record<string, unknown>) || {};
        updateData.preferences = {
          ...currentPrefs,
          ...body.preferences,
        };
      }

      const user = await prisma.user.update({
        where: { id: authUser.id },
        data: updateData,
      });

      return reply.send({
        success: true,
        data: {
          id: user.id,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          preferences: user.preferences,
          onboardingStep: user.onboardingStep,
          onboardingDone: user.onboardingDone,
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

  // PATCH /users/me/onboarding - Update onboarding progress
  fastify.patch('/me/onboarding', async (request, reply) => {
    const authUser = request.user!;

    try {
      const body = onboardingSchema.parse(request.body);

      const user = await prisma.user.update({
        where: { id: authUser.id },
        data: {
          onboardingStep: body.step,
          onboardingDone: body.completed ?? false,
        },
      });

      return reply.send({
        success: true,
        data: {
          onboardingStep: user.onboardingStep,
          onboardingDone: user.onboardingDone,
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

  // POST /users/me/onboarding/complete - Mark onboarding as complete
  fastify.post('/me/onboarding/complete', async (request, reply) => {
    const authUser = request.user!;

    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        onboardingStep: 3,
        onboardingDone: true,
      },
    });

    return reply.send({
      success: true,
      data: {
        onboardingDone: user.onboardingDone,
      },
    });
  });
}
