import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { adminAuthMiddleware } from '../../middleware/adminAuth.js';
import * as crypto from 'crypto';

// Simple password hashing using scrypt (built-in, no extra dependency)
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
}

// Schemas
const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

const createAdminSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(100),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']).default('ADMIN'),
});

export const adminAuthRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/auth/login - Admin login
  fastify.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      // Find admin by username
      const admin = await prisma.admin.findUnique({
        where: { username: body.username },
      });

      if (!admin || !admin.isActive) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
        });
      }

      // Verify password
      const isValid = await verifyPassword(body.password, admin.passwordHash);
      if (!isValid) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
        });
      }

      // Update last login
      await prisma.admin.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate JWT
      const token = fastify.jwt.sign(
        {
          adminId: admin.id,
          role: admin.role,
          type: 'admin',
        },
        { expiresIn: '24h' }
      );

      return reply.send({
        success: true,
        data: {
          token,
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            displayName: admin.displayName,
            role: admin.role,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
        });
      }
      throw error;
    }
  });

  // GET /admin/auth/me - Get current admin
  fastify.get('/me', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const admin = await prisma.admin.findUnique({
      where: { id: request.admin!.id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return reply.send({
      success: true,
      data: { admin },
    });
  });

  // PATCH /admin/auth/password - Change password
  fastify.patch('/password', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    try {
      const body = changePasswordSchema.parse(request.body);

      const admin = await prisma.admin.findUnique({
        where: { id: request.admin!.id },
      });

      if (!admin) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Admin not found' },
        });
      }

      // Verify current password
      const isValid = await verifyPassword(body.currentPassword, admin.passwordHash);
      if (!isValid) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' },
        });
      }

      // Hash new password
      const newHash = await hashPassword(body.newPassword);

      await prisma.admin.update({
        where: { id: admin.id },
        data: { passwordHash: newHash },
      });

      return reply.send({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
        });
      }
      throw error;
    }
  });

  // POST /admin/auth/create - Create new admin (SUPER_ADMIN only)
  fastify.post('/create', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    // Check if current admin is SUPER_ADMIN
    if (request.admin!.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only super admins can create new admins' },
      });
    }

    try {
      const body = createAdminSchema.parse(request.body);

      // Check if username already exists
      const existing = await prisma.admin.findFirst({
        where: {
          OR: [
            { username: body.username },
            body.email ? { email: body.email } : {},
          ],
        },
      });

      if (existing) {
        return reply.status(400).send({
          success: false,
          error: { code: 'ALREADY_EXISTS', message: 'Username or email already exists' },
        });
      }

      // Hash password
      const passwordHash = await hashPassword(body.password);

      const admin = await prisma.admin.create({
        data: {
          username: body.username,
          passwordHash,
          email: body.email,
          displayName: body.displayName,
          role: body.role,
        },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
        },
      });

      return reply.status(201).send({
        success: true,
        data: { admin },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
        });
      }
      throw error;
    }
  });

  // GET /admin/auth/admins - List all admins (SUPER_ADMIN only)
  fastify.get('/admins', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    if (request.admin!.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only super admins can view all admins' },
      });
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      success: true,
      data: { admins },
    });
  });

  // DELETE /admin/auth/admins/:id - Delete admin (SUPER_ADMIN only)
  fastify.delete('/admins/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    if (request.admin!.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only super admins can delete admins' },
      });
    }

    const { id } = request.params as { id: string };

    // Prevent self-deletion
    if (id === request.admin!.id) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_OPERATION', message: 'Cannot delete your own account' },
      });
    }

    await prisma.admin.delete({
      where: { id },
    });

    return reply.send({
      success: true,
      message: 'Admin deleted successfully',
    });
  });
};

// Export password hash function for seeding
export { hashPassword };
