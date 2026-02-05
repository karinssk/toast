import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

export async function restaurantRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authMiddleware);

  // GET /restaurants/:restaurantId - Get restaurant details
  fastify.get('/:restaurantId', async (request, reply) => {
    const { restaurantId } = request.params as { restaurantId: string };

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        menus: {
          where: { isAvailable: true },
          include: {
            menu: {
              select: {
                id: true,
                name: true,
                nameLocal: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'RESTAURANT_NOT_FOUND',
          message: 'Restaurant not found',
        },
      });
    }

    // Check if currently open
    const now = new Date();
    const isOpen = isRestaurantOpen(restaurant.openingHours as any, now);

    return reply.send({
      success: true,
      data: {
        id: restaurant.id,
        name: restaurant.name,
        nameLocal: restaurant.nameLocal,
        imageUrl: restaurant.imageUrl,
        description: restaurant.description,
        address: restaurant.address,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        priceLevel: restaurant.priceLevel,
        rating: restaurant.rating,
        reviewCount: restaurant.reviewCount,
        phone: restaurant.phone,
        openingHours: restaurant.openingHours,
        isCurrentlyOpen: isOpen,
        googleMapsUrl: restaurant.googleMapsUrl,
        menus: restaurant.menus.map((rm) => ({
          id: rm.menu.id,
          name: rm.menu.name,
          nameLocal: rm.menu.nameLocal,
          price: rm.price,
        })),
      },
    });
  });
}

// Check if restaurant is currently open
function isRestaurantOpen(
  openingHours: Record<string, Array<{ open: string; close: string }>>,
  now: Date
): boolean {
  if (!openingHours) return true;

  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = days[now.getDay()];
  const todayHours = openingHours[dayName];

  if (!todayHours || todayHours.length === 0) return false;

  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return todayHours.some((period) => {
    return currentTime >= period.open && currentTime <= period.close;
  });
}
