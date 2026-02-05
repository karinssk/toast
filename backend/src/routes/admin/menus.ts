import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { adminAuthMiddleware, requireRole } from '../../middleware/adminAuth.js';

// Schemas
const createMenuSchema = z.object({
  name: z.string().min(1).max(200),
  nameLocal: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url(),
  cuisineType: z.string().min(1),
  tags: z.array(z.string()).default([]),
  priceRangeLow: z.number().int().positive(),
  priceRangeHigh: z.number().int().positive(),
  popularity: z.number().min(0).max(1).default(0),
  isActive: z.boolean().default(true),
});

const updateMenuSchema = createMenuSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  cuisineType: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'cuisineType', 'popularity', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const adminMenuRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('preHandler', adminAuthMiddleware);

  // GET /admin/menus - List menus with pagination
  fastify.get('/', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const skip = (query.page - 1) * query.limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nameLocal: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.cuisineType) {
      where.cuisineType = query.cuisineType;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [menus, total] = await Promise.all([
      prisma.menu.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          _count: {
            select: { restaurants: true, swipes: true },
          },
        },
      }),
      prisma.menu.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        menus,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
    });
  });

  // GET /admin/menus/:id - Get single menu
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const menu = await prisma.menu.findUnique({
      where: { id },
      include: {
        restaurants: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                nameLocal: true,
                address: true,
                priceLevel: true,
                rating: true,
              },
            },
          },
        },
        _count: {
          select: { swipes: true, matches: true, decisions: true },
        },
      },
    });

    if (!menu) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Menu not found' },
      });
    }

    return reply.send({
      success: true,
      data: { menu },
    });
  });

  // POST /admin/menus - Create menu
  fastify.post('/', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    try {
      const body = createMenuSchema.parse(request.body);

      if (body.priceRangeLow > body.priceRangeHigh) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'priceRangeLow cannot be greater than priceRangeHigh' },
        });
      }

      const menu = await prisma.menu.create({
        data: body,
      });

      return reply.status(201).send({
        success: true,
        data: { menu },
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

  // PUT /admin/menus/:id - Update menu
  fastify.put('/:id', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };

    try {
      const body = updateMenuSchema.parse(request.body);

      if (body.priceRangeLow && body.priceRangeHigh && body.priceRangeLow > body.priceRangeHigh) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'priceRangeLow cannot be greater than priceRangeHigh' },
        });
      }

      const menu = await prisma.menu.update({
        where: { id },
        data: body,
      });

      return reply.send({
        success: true,
        data: { menu },
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

  // DELETE /admin/menus/:id - Delete menu
  fastify.delete('/:id', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };

    // Check if menu has any swipes or decisions
    const menu = await prisma.menu.findUnique({
      where: { id },
      include: {
        _count: {
          select: { swipes: true, decisions: true },
        },
      },
    });

    if (!menu) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Menu not found' },
      });
    }

    // Soft delete if there are related records
    if (menu._count.swipes > 0 || menu._count.decisions > 0) {
      await prisma.menu.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.send({
        success: true,
        message: 'Menu deactivated (has related records)',
      });
    }

    // Hard delete if no related records
    await prisma.menu.delete({
      where: { id },
    });

    return reply.send({
      success: true,
      message: 'Menu deleted successfully',
    });
  });

  // GET /admin/menus/cuisine-types - Get unique cuisine types
  fastify.get('/meta/cuisine-types', async (_request, reply) => {
    const cuisineTypes = await prisma.menu.findMany({
      select: { cuisineType: true },
      distinct: ['cuisineType'],
      orderBy: { cuisineType: 'asc' },
    });

    return reply.send({
      success: true,
      data: { cuisineTypes: cuisineTypes.map((c) => c.cuisineType) },
    });
  });

  // POST /admin/menus/:id/restaurants - Link menu to restaurant
  fastify.post('/:id/restaurants', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };
    const body = z.object({
      restaurantId: z.string(),
      price: z.number().int().positive().optional(),
    }).parse(request.body);

    const link = await prisma.restaurantMenu.create({
      data: {
        menuId: id,
        restaurantId: body.restaurantId,
        price: body.price,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reply.status(201).send({
      success: true,
      data: { link },
    });
  });

  // DELETE /admin/menus/:id/restaurants/:restaurantId - Unlink menu from restaurant
  fastify.delete('/:id/restaurants/:restaurantId', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    const { id, restaurantId } = request.params as { id: string; restaurantId: string };

    await prisma.restaurantMenu.delete({
      where: {
        restaurantId_menuId: {
          restaurantId,
          menuId: id,
        },
      },
    });

    return reply.send({
      success: true,
      message: 'Menu unlinked from restaurant',
    });
  });
};
