import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const menuQuerySchema = z.object({
  cuisines: z.string().optional(), // comma-separated
  priceMin: z.coerce.number().min(1).max(4).optional(),
  priceMax: z.coerce.number().min(1).max(4).optional(),
  tags: z.string().optional(), // comma-separated
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const restaurantQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  maxDistance: z.coerce.number().min(100).max(50000).default(5000),
  priceLevel: z.string().optional(), // comma-separated
  openNow: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export async function menuRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authMiddleware);

  // GET /menus - Get menus (filtered)
  fastify.get('/', async (request, reply) => {
    try {
      const query = menuQuerySchema.parse(request.query);

      const where: any = {
        isActive: true,
      };

      // Filter by cuisines
      if (query.cuisines) {
        const cuisineList = query.cuisines.split(',').map((c) => c.trim().toLowerCase());
        where.cuisineType = { in: cuisineList };
      }

      // Filter by price range (convert 1-4 scale to actual price)
      if (query.priceMin || query.priceMax) {
        where.priceRangeLow = {};
        where.priceRangeHigh = {};

        if (query.priceMin) {
          // Price level 1 = 0-100, 2 = 100-200, etc.
          where.priceRangeLow.gte = (query.priceMin - 1) * 100;
        }
        if (query.priceMax) {
          where.priceRangeHigh.lte = query.priceMax * 100;
        }
      }

      // Filter by tags
      if (query.tags) {
        const tagList = query.tags.split(',').map((t) => t.trim().toLowerCase());
        where.tags = { hasSome: tagList };
      }

      // Get total count
      const total = await prisma.menu.count({ where });

      // Get menus
      const menus = await prisma.menu.findMany({
        where,
        orderBy: { popularity: 'desc' },
        skip: query.offset,
        take: query.limit,
        include: {
          _count: {
            select: { restaurants: true },
          },
        },
      });

      return reply.send({
        success: true,
        data: {
          menus: menus.map((menu) => ({
            id: menu.id,
            name: menu.name,
            nameLocal: menu.nameLocal,
            imageUrl: menu.imageUrl,
            cuisineType: menu.cuisineType,
            priceRange: [menu.priceRangeLow, menu.priceRangeHigh],
            tags: menu.tags,
            restaurantCount: menu._count.restaurants,
          })),
          total,
          hasMore: query.offset + menus.length < total,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
          },
        });
      }
      throw error;
    }
  });

  // GET /menus/:menuId - Get menu details
  fastify.get('/:menuId', async (request, reply) => {
    const { menuId } = request.params as { menuId: string };

    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: {
        _count: {
          select: { restaurants: true },
        },
      },
    });

    if (!menu) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'MENU_NOT_FOUND',
          message: 'Menu not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        id: menu.id,
        name: menu.name,
        nameLocal: menu.nameLocal,
        description: menu.description,
        imageUrl: menu.imageUrl,
        cuisineType: menu.cuisineType,
        priceRange: [menu.priceRangeLow, menu.priceRangeHigh],
        tags: menu.tags,
        restaurantCount: menu._count.restaurants,
      },
    });
  });

  // GET /menus/:menuId/restaurants - Get restaurants serving a specific menu
  fastify.get('/:menuId/restaurants', async (request, reply) => {
    const { menuId } = request.params as { menuId: string };

    try {
      const query = restaurantQuerySchema.parse(request.query);

      // Check if menu exists
      const menu = await prisma.menu.findUnique({
        where: { id: menuId },
      });

      if (!menu) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'MENU_NOT_FOUND',
            message: 'Menu not found',
          },
        });
      }

      // Get restaurants that serve this menu
      const restaurantMenus = await prisma.restaurantMenu.findMany({
        where: {
          menuId,
          isAvailable: true,
          restaurant: {
            isActive: true,
            ...(query.priceLevel ? {
              priceLevel: { in: query.priceLevel.split(',').map(Number) },
            } : {}),
          },
        },
        include: {
          restaurant: true,
        },
      });

      // Calculate distances and filter
      const restaurantsWithDistance = restaurantMenus
        .map((rm) => {
          const distance = calculateDistance(
            query.lat,
            query.lng,
            rm.restaurant.latitude,
            rm.restaurant.longitude
          );
          return {
            ...rm.restaurant,
            distance,
            menuPrice: rm.price,
          };
        })
        .filter((r) => r.distance <= query.maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, query.limit);

      // Check if restaurants are currently open
      const now = new Date();
      const restaurants = restaurantsWithDistance.map((r) => ({
        id: r.id,
        name: r.name,
        nameLocal: r.nameLocal,
        imageUrl: r.imageUrl,
        distance: Math.round(r.distance),
        rating: r.rating,
        priceLevel: r.priceLevel,
        isOpen: isRestaurantOpen(r.openingHours as any, now),
        address: r.address,
        menuPrice: r.menuPrice,
        googleMapsUrl: r.googleMapsUrl,
      }));

      // Filter by openNow if specified
      const filteredRestaurants = query.openNow
        ? restaurants.filter((r) => r.isOpen)
        : restaurants;

      return reply.send({
        success: true,
        data: {
          restaurants: filteredRestaurants,
          total: filteredRestaurants.length,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
          },
        });
      }
      throw error;
    }
  });
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Check if restaurant is currently open
function isRestaurantOpen(
  openingHours: Record<string, Array<{ open: string; close: string }>>,
  now: Date
): boolean {
  if (!openingHours) return true; // Assume open if no hours specified

  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = days[now.getDay()];
  const todayHours = openingHours[dayName];

  if (!todayHours || todayHours.length === 0) return false;

  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return todayHours.some((period) => {
    return currentTime >= period.open && currentTime <= period.close;
  });
}
