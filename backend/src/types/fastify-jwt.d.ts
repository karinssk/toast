import type { AuthUser } from '../middleware/auth.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthUser;
  }
}
