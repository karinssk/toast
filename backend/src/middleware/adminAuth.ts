import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

// Extend FastifyRequest to include admin
declare module 'fastify' {
  interface FastifyRequest {
    admin?: {
      id: string;
      username: string;
      role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';
    };
  }
}

export async function adminAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT
    const decoded = request.server.jwt.verify<{
      adminId: string;
      role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';
      type: 'admin';
    }>(token);

    // Ensure it's an admin token
    if (decoded.type !== 'admin') {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token type' },
      });
    }

    // Fetch admin from database
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Admin not found or inactive' },
      });
    }

    // Attach admin to request
    request.admin = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }
}

// Role-based access control middleware
export function requireRole(...allowedRoles: Array<'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR'>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.admin) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!allowedRoles.includes(request.admin.role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }
  };
}
