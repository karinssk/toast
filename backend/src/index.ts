import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { setupSocketIO } from './socket/index.js';

// Import routes
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { sessionRoutes } from './routes/sessions.js';
import { menuRoutes } from './routes/menus.js';
import { restaurantRoutes } from './routes/restaurants.js';
import { analyticsRoutes } from './routes/analytics.js';

// Admin routes
import { adminAuthRoutes } from './routes/admin/auth.js';
import { adminMenuRoutes } from './routes/admin/menus.js';
import { adminRestaurantRoutes } from './routes/admin/restaurants.js';
import { adminSessionRoutes } from './routes/admin/sessions.js';

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport: env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

// Add content-type parser that accepts empty JSON bodies
// This prevents 400 errors when POST requests have Content-Type: application/json but no body
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (_req, body, done) {
  try {
    const str = (body as string || '').trim();
    const json = str.length === 0 ? {} : JSON.parse(str);
    done(null, json);
  } catch (err: any) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

// Setup Socket.IO on Fastify's server
const io = new Server(fastify.server, {
  cors: {
    origin: env.NODE_ENV === 'development'
      ? ['http://localhost:3000', 'http://127.0.0.1:3000', env.FRONTEND_URL]
      : env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in routes
fastify.decorate('io', io);

// Register plugins
await fastify.register(cors, {
  origin: env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://127.0.0.1:3000', env.FRONTEND_URL]
    : env.FRONTEND_URL,
  credentials: true,
});

await fastify.register(jwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: '7d',
  },
});

// Global request/response logging to debug 400 errors
fastify.addHook('onRequest', async (request) => {
  if (request.url.includes('/sessions/') && request.method === 'POST') {
    console.log(`[HTTP] ${request.method} ${request.url} Content-Type: ${request.headers['content-type']}, Content-Length: ${request.headers['content-length']}`);
  }
});

fastify.addHook('onResponse', async (request, reply) => {
  if (request.url.includes('/sessions/') && request.method === 'POST' && reply.statusCode >= 400) {
    console.log(`[HTTP] ${request.method} ${request.url} -> ${reply.statusCode}`);
  }
});

fastify.addHook('onError', async (request, _reply, error) => {
  if (request.url.includes('/sessions/')) {
    console.log(`[HTTP-ERROR] ${request.method} ${request.url} -> Error: ${error.message}, statusCode: ${error.statusCode || 'unknown'}`);
  }
});

// Health check
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  };
});

// Register API routes
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
await fastify.register(userRoutes, { prefix: '/api/v1/users' });
await fastify.register(sessionRoutes, { prefix: '/api/v1/sessions' });
await fastify.register(menuRoutes, { prefix: '/api/v1/menus' });
await fastify.register(restaurantRoutes, { prefix: '/api/v1/restaurants' });
await fastify.register(analyticsRoutes, { prefix: '/api/v1/analytics' });

// Register Admin routes
await fastify.register(adminAuthRoutes, { prefix: '/api/v1/admin/auth' });
await fastify.register(adminMenuRoutes, { prefix: '/api/v1/admin/menus' });
await fastify.register(adminRestaurantRoutes, { prefix: '/api/v1/admin/restaurants' });
await fastify.register(adminSessionRoutes, { prefix: '/api/v1/admin/sessions' });

// Setup Socket.IO handlers
setupSocketIO(io);

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  await fastify.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const start = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected');

    // Test Redis connection
    await redis.ping();
    console.log('Redis connected');

    // Start Fastify (but use httpServer for listening)
    await fastify.ready();

    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${env.PORT}`);
    console.log(`Socket.IO ready`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Type declarations
declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}
