import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { lineService } from '../services/line.js';
import { authMiddleware } from '../middleware/auth.js';

const loginSchema = z.object({
  idToken: z.string().min(1),
  liffId: z.string().optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/line - Authenticate with LINE LIFF token
  fastify.post('/line', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      // Verify LINE ID token
      const lineProfile = await lineService.verifyIdToken(body.idToken);

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { lineUserId: lineProfile.userId },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            lineUserId: lineProfile.userId,
            displayName: lineProfile.displayName,
            pictureUrl: lineProfile.pictureUrl || null,
          },
        });
      } else {
        // Update existing user profile
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            displayName: lineProfile.displayName,
            pictureUrl: lineProfile.pictureUrl || user.pictureUrl,
            lastActiveAt: new Date(),
          },
        });
      }

      // Generate JWT
      const accessToken = fastify.jwt.sign(
        { userId: user.id },
        { expiresIn: '7d' }
      );

      return reply.send({
        success: true,
        data: {
          accessToken,
          expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
          user: {
            id: user.id,
            lineUserId: user.lineUserId,
            displayName: user.displayName,
            pictureUrl: user.pictureUrl,
            onboardingDone: user.onboardingDone,
            preferences: user.preferences,
          },
        },
      });
    } catch (error) {
      console.error('Auth error:', error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
          },
        });
      }

      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'LINE token verification failed',
        },
      });
    }
  });

  // POST /auth/refresh - Refresh access token
  fastify.post('/refresh', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const user = request.user!;

    // Generate new JWT
    const accessToken = fastify.jwt.sign(
      { userId: user.id },
      { expiresIn: '7d' }
    );

    return reply.send({
      success: true,
      data: {
        accessToken,
        expiresIn: 7 * 24 * 60 * 60,
      },
    });
  });

  // POST /auth/logout - Logout (invalidate session)
  fastify.post('/logout', {
    preHandler: [authMiddleware],
  }, async (_request, reply) => {
    // In a stateless JWT system, we don't need to do anything server-side
    // The client should discard the token
    // For added security, you could maintain a token blacklist in Redis

    return reply.send({
      success: true,
      data: { loggedOut: true },
    });
  });
}
