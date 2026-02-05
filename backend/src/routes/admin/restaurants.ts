import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { adminAuthMiddleware, requireRole } from '../../middleware/adminAuth.js';

// Schemas
const createRestaurantSchema = z.object({
  name: z.string().min(1).max(200),
  nameLocal: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1).max(500),
  priceLevel: z.number().int().min(1).max(4),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).default(0),
  openingHours: z.record(z.array(z.object({
    open: z.string(),
    close: z.string(),
  }))).default({}),
  phone: z.string().max(50).optional(),
  lineOfficialId: z.string().max(100).optional(),
  website: z.string().url().optional(),
  googleMapsUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

const updateRestaurantSchema = createRestaurantSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  priceLevel: z.coerce.number().int().min(1).max(4).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'priceLevel', 'rating', 'reviewCount', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const adminRestaurantRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('preHandler', adminAuthMiddleware);

  // GET /admin/restaurants - List restaurants with pagination
  fastify.get('/', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const skip = (query.page - 1) * query.limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nameLocal: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.priceLevel) {
      where.priceLevel = query.priceLevel;
    }

    if (query.minRating) {
      where.rating = { gte: query.minRating };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          _count: {
            select: { menus: true, swipes: true },
          },
        },
      }),
      prisma.restaurant.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        restaurants,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
    });
  });

  // GET /admin/restaurants/:id - Get single restaurant
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        menus: {
          include: {
            menu: {
              select: {
                id: true,
                name: true,
                nameLocal: true,
                cuisineType: true,
                imageUrl: true,
              },
            },
          },
        },
        _count: {
          select: { swipes: true, decisions: true },
        },
      },
    });

    if (!restaurant) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Restaurant not found' },
      });
    }

    return reply.send({
      success: true,
      data: { restaurant },
    });
  });

  // POST /admin/restaurants - Create restaurant
  fastify.post('/', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    try {
      const body = createRestaurantSchema.parse(request.body);

      const restaurant = await prisma.restaurant.create({
        data: body,
      });

      return reply.status(201).send({
        success: true,
        data: { restaurant },
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

  // PUT /admin/restaurants/:id - Update restaurant
  fastify.put('/:id', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };

    try {
      const body = updateRestaurantSchema.parse(request.body);

      const restaurant = await prisma.restaurant.update({
        where: { id },
        data: body,
      });

      return reply.send({
        success: true,
        data: { restaurant },
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

  // DELETE /admin/restaurants/:id - Delete restaurant
  fastify.delete('/:id', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };

    // Check if restaurant has any swipes or decisions
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { swipes: true, decisions: true },
        },
      },
    });

    if (!restaurant) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Restaurant not found' },
      });
    }

    // Soft delete if there are related records
    if (restaurant._count.swipes > 0 || restaurant._count.decisions > 0) {
      await prisma.restaurant.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.send({
        success: true,
        message: 'Restaurant deactivated (has related records)',
      });
    }

    // Hard delete if no related records
    await prisma.restaurant.delete({
      where: { id },
    });

    return reply.send({
      success: true,
      message: 'Restaurant deleted successfully',
    });
  });

  // POST /admin/restaurants/:id/menus - Link restaurant to menu
  fastify.post('/:id/menus', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };
    const body = z.object({
      menuId: z.string(),
      price: z.number().int().positive().optional(),
    }).parse(request.body);

    const link = await prisma.restaurantMenu.create({
      data: {
        restaurantId: id,
        menuId: body.menuId,
        price: body.price,
      },
      include: {
        menu: {
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

  // DELETE /admin/restaurants/:id/menus/:menuId - Unlink restaurant from menu
  fastify.delete('/:id/menus/:menuId', async (request, reply) => {
    await requireRole('SUPER_ADMIN', 'ADMIN')(request, reply);
    if (reply.sent) return;

    const { id, menuId } = request.params as { id: string; menuId: string };

    await prisma.restaurantMenu.delete({
      where: {
        restaurantId_menuId: {
          restaurantId: id,
          menuId,
        },
      },
    });

    return reply.send({
      success: true,
      message: 'Restaurant unlinked from menu',
    });
  });
};
