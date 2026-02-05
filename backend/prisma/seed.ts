import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.restaurantMenu.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.match.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.sessionMember.deleteMany();
  await prisma.session.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.menu.deleteMany();

  // Create menus
  const menus = await Promise.all([
    // Thai cuisine
    prisma.menu.create({
      data: {
        name: 'Pad Thai',
        nameLocal: 'ผัดไทย',
        description: 'Stir-fried rice noodles with shrimp, tofu, peanuts, and bean sprouts',
        imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800',
        cuisineType: 'thai',
        tags: ['signature', 'noodles', 'popular'],
        priceRangeLow: 80,
        priceRangeHigh: 150,
        popularity: 0.95,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Tom Yum Goong',
        nameLocal: 'ต้มยำกุ้ง',
        description: 'Spicy and sour soup with shrimp, lemongrass, and mushrooms',
        imageUrl: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=800',
        cuisineType: 'thai',
        tags: ['soup', 'spicy', 'seafood'],
        priceRangeLow: 150,
        priceRangeHigh: 300,
        popularity: 0.92,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Green Curry',
        nameLocal: 'แกงเขียวหวาน',
        description: 'Thai green curry with chicken, eggplant, and Thai basil',
        imageUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
        cuisineType: 'thai',
        tags: ['curry', 'spicy', 'chicken'],
        priceRangeLow: 120,
        priceRangeHigh: 200,
        popularity: 0.88,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Som Tam',
        nameLocal: 'ส้มตำ',
        description: 'Spicy green papaya salad with peanuts and dried shrimp',
        imageUrl: 'https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?w=800',
        cuisineType: 'thai',
        tags: ['salad', 'spicy', 'vegetarian'],
        priceRangeLow: 60,
        priceRangeHigh: 120,
        popularity: 0.85,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Mango Sticky Rice',
        nameLocal: 'ข้าวเหนียวมะม่วง',
        description: 'Sweet sticky rice with fresh mango and coconut cream',
        imageUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800',
        cuisineType: 'thai',
        tags: ['dessert', 'sweet', 'popular'],
        priceRangeLow: 80,
        priceRangeHigh: 150,
        popularity: 0.90,
      },
    }),

    // Japanese cuisine
    prisma.menu.create({
      data: {
        name: 'Salmon Sashimi',
        nameLocal: 'サーモン刺身',
        description: 'Fresh sliced raw salmon served with wasabi and soy sauce',
        imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
        cuisineType: 'japanese',
        tags: ['sashimi', 'seafood', 'raw'],
        priceRangeLow: 250,
        priceRangeHigh: 450,
        popularity: 0.91,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Tonkotsu Ramen',
        nameLocal: '豚骨ラーメン',
        description: 'Rich pork bone broth ramen with chashu, egg, and green onions',
        imageUrl: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800',
        cuisineType: 'japanese',
        tags: ['noodles', 'soup', 'pork'],
        priceRangeLow: 180,
        priceRangeHigh: 320,
        popularity: 0.93,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Chicken Katsu Curry',
        nameLocal: 'チキンカツカレー',
        description: 'Crispy fried chicken cutlet with Japanese curry rice',
        imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
        cuisineType: 'japanese',
        tags: ['curry', 'chicken', 'fried'],
        priceRangeLow: 200,
        priceRangeHigh: 350,
        popularity: 0.87,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Salmon Don',
        nameLocal: 'サーモン丼',
        description: 'Fresh salmon over sushi rice with special sauce',
        imageUrl: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800',
        cuisineType: 'japanese',
        tags: ['rice', 'seafood', 'popular'],
        priceRangeLow: 280,
        priceRangeHigh: 450,
        popularity: 0.89,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Gyoza',
        nameLocal: '餃子',
        description: 'Pan-fried Japanese dumplings with pork and vegetables',
        imageUrl: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800',
        cuisineType: 'japanese',
        tags: ['appetizer', 'fried', 'pork'],
        priceRangeLow: 100,
        priceRangeHigh: 180,
        popularity: 0.86,
      },
    }),

    // Italian cuisine
    prisma.menu.create({
      data: {
        name: 'Margherita Pizza',
        nameLocal: 'Pizza Margherita',
        description: 'Classic pizza with tomato sauce, mozzarella, and fresh basil',
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
        cuisineType: 'italian',
        tags: ['pizza', 'vegetarian', 'classic'],
        priceRangeLow: 250,
        priceRangeHigh: 400,
        popularity: 0.94,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Carbonara',
        nameLocal: 'Spaghetti alla Carbonara',
        description: 'Creamy pasta with eggs, pecorino, guanciale, and black pepper',
        imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
        cuisineType: 'italian',
        tags: ['pasta', 'creamy', 'pork'],
        priceRangeLow: 280,
        priceRangeHigh: 420,
        popularity: 0.91,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Risotto ai Funghi',
        nameLocal: 'Risotto ai Funghi',
        description: 'Creamy arborio rice with mixed mushrooms and parmesan',
        imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800',
        cuisineType: 'italian',
        tags: ['rice', 'vegetarian', 'creamy'],
        priceRangeLow: 320,
        priceRangeHigh: 480,
        popularity: 0.85,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Tiramisu',
        nameLocal: 'Tiramisù',
        description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone',
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800',
        cuisineType: 'italian',
        tags: ['dessert', 'coffee', 'sweet'],
        priceRangeLow: 180,
        priceRangeHigh: 280,
        popularity: 0.88,
      },
    }),

    // Korean cuisine
    prisma.menu.create({
      data: {
        name: 'Korean Fried Chicken',
        nameLocal: '양념치킨',
        description: 'Double-fried crispy chicken with sweet and spicy gochujang glaze',
        imageUrl: 'https://images.unsplash.com/photo-1575932444877-5106bee2a599?w=800',
        cuisineType: 'korean',
        tags: ['fried', 'chicken', 'spicy'],
        priceRangeLow: 280,
        priceRangeHigh: 450,
        popularity: 0.93,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Bibimbap',
        nameLocal: '비빔밥',
        description: 'Mixed rice bowl with vegetables, beef, egg, and gochujang',
        imageUrl: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=800',
        cuisineType: 'korean',
        tags: ['rice', 'beef', 'healthy'],
        priceRangeLow: 180,
        priceRangeHigh: 300,
        popularity: 0.89,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Korean BBQ Set',
        nameLocal: '삼겹살 세트',
        description: 'Grilled pork belly with banchan and lettuce wraps',
        imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
        cuisineType: 'korean',
        tags: ['bbq', 'pork', 'sharing'],
        priceRangeLow: 450,
        priceRangeHigh: 800,
        popularity: 0.92,
      },
    }),

    // Chinese cuisine
    prisma.menu.create({
      data: {
        name: 'Dim Sum Set',
        nameLocal: '点心套餐',
        description: 'Assorted steamed dumplings including har gow, siu mai, and char siu bao',
        imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800',
        cuisineType: 'chinese',
        tags: ['dim sum', 'steamed', 'sharing'],
        priceRangeLow: 350,
        priceRangeHigh: 600,
        popularity: 0.90,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Peking Duck',
        nameLocal: '北京烤鸭',
        description: 'Roasted duck with thin pancakes, scallions, and hoisin sauce',
        imageUrl: 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=800',
        cuisineType: 'chinese',
        tags: ['duck', 'roasted', 'signature'],
        priceRangeLow: 800,
        priceRangeHigh: 1500,
        popularity: 0.88,
      },
    }),
    prisma.menu.create({
      data: {
        name: 'Mapo Tofu',
        nameLocal: '麻婆豆腐',
        description: 'Spicy Sichuan tofu with minced pork in chili bean sauce',
        imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800',
        cuisineType: 'chinese',
        tags: ['spicy', 'tofu', 'sichuan'],
        priceRangeLow: 150,
        priceRangeHigh: 250,
        popularity: 0.84,
      },
    }),
  ]);

  console.log(`Created ${menus.length} menus`);

  // Create restaurants
  const restaurants = await Promise.all([
    // Thai restaurants
    prisma.restaurant.create({
      data: {
        name: 'Thipsamai',
        nameLocal: 'ทิพย์สมัย',
        description: 'Famous Pad Thai restaurant since 1966, known for the best Pad Thai in Bangkok',
        imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
        latitude: 13.7515,
        longitude: 100.5015,
        address: '313 Maha Chai Rd, Samran Rat, Phra Nakhon, Bangkok 10200',
        priceLevel: 2,
        rating: 4.5,
        reviewCount: 2341,
        phone: '+66 2 226 6666',
        openingHours: {
          mon: [],
          tue: [{ open: '17:00', close: '02:00' }],
          wed: [{ open: '17:00', close: '02:00' }],
          thu: [{ open: '17:00', close: '02:00' }],
          fri: [{ open: '17:00', close: '02:00' }],
          sat: [{ open: '17:00', close: '02:00' }],
          sun: [{ open: '17:00', close: '02:00' }],
        },
        googleMapsUrl: 'https://maps.google.com/?q=Thipsamai+Bangkok',
      },
    }),
    prisma.restaurant.create({
      data: {
        name: 'Jay Fai',
        nameLocal: 'เจ๊ไฝ',
        description: 'Michelin-starred street food stall famous for crab omelette',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
        latitude: 13.7520,
        longitude: 100.5025,
        address: '327 Maha Chai Rd, Samran Rat, Phra Nakhon, Bangkok 10200',
        priceLevel: 3,
        rating: 4.7,
        reviewCount: 1856,
        phone: '+66 2 223 9384',
        openingHours: {
          mon: [{ open: '14:00', close: '23:00' }],
          tue: [{ open: '14:00', close: '23:00' }],
          wed: [{ open: '14:00', close: '23:00' }],
          thu: [{ open: '14:00', close: '23:00' }],
          fri: [{ open: '14:00', close: '23:00' }],
          sat: [{ open: '14:00', close: '23:00' }],
          sun: [],
        },
        googleMapsUrl: 'https://maps.google.com/?q=Jay+Fai+Bangkok',
      },
    }),
    prisma.restaurant.create({
      data: {
        name: 'Somtum Der',
        nameLocal: 'ส้มตำเด้อ',
        description: 'Isaan restaurant specializing in papaya salad and northeastern Thai cuisine',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        latitude: 13.7305,
        longitude: 100.5350,
        address: '5/5 Sala Daeng Rd, Silom, Bang Rak, Bangkok 10500',
        priceLevel: 2,
        rating: 4.3,
        reviewCount: 1234,
        phone: '+66 2 632 4499',
        openingHours: {
          mon: [{ open: '11:00', close: '22:00' }],
          tue: [{ open: '11:00', close: '22:00' }],
          wed: [{ open: '11:00', close: '22:00' }],
          thu: [{ open: '11:00', close: '22:00' }],
          fri: [{ open: '11:00', close: '22:00' }],
          sat: [{ open: '11:00', close: '22:00' }],
          sun: [{ open: '11:00', close: '22:00' }],
        },
        googleMapsUrl: 'https://maps.google.com/?q=Somtum+Der+Bangkok',
      },
    }),

    // Japanese restaurants
    prisma.restaurant.create({
      data: {
        name: 'Sushi Hiro',
        nameLocal: 'ซูชิ ฮิโระ',
        description: 'Premium omakase sushi restaurant with fresh fish flown in from Japan',
        imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
        latitude: 13.7430,
        longitude: 100.5450,
        address: '49 Soi Sukhumvit 31, Khlong Toei Nuea, Watthana, Bangkok 10110',
        priceLevel: 4,
        rating: 4.6,
        reviewCount: 892,
        phone: '+66 2 662 1988',
        openingHours: {
          mon: [{ open: '11:30', close: '14:00' }, { open: '18:00', close: '22:00' }],
          tue: [{ open: '11:30', close: '14:00' }, { open: '18:00', close: '22:00' }],
          wed: [{ open: '11:30', close: '14:00' }, { open: '18:00', close: '22:00' }],
          thu: [{ open: '11:30', close: '14:00' }, { open: '18:00', close: '22:00' }],
          fri: [{ open: '11:30', close: '14:00' }, { open: '18:00', close: '22:00' }],
          sat: [{ open: '11:30', close: '14:00' }, { open: '18:00', close: '22:00' }],
          sun: [{ open: '11:30', close: '14:00' }, { open: '18:00', close: '22:00' }],
        },
        googleMapsUrl: 'https://maps.google.com/?q=Sushi+Hiro+Bangkok',
      },
    }),
    prisma.restaurant.create({
      data: {
        name: 'Bankara Ramen',
        nameLocal: 'ばんから ラーメン',
        description: 'Authentic Tokyo-style ramen shop known for rich tonkotsu broth',
        imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
        latitude: 13.7465,
        longitude: 100.5380,
        address: 'Siam Square One, 388 Rama I Rd, Pathum Wan, Bangkok 10330',
        priceLevel: 2,
        rating: 4.2,
        reviewCount: 1567,
        phone: '+66 2 115 1234',
        openingHours: {
          mon: [{ open: '10:00', close: '22:00' }],
          tue: [{ open: '10:00', close: '22:00' }],
          wed: [{ open: '10:00', close: '22:00' }],
          thu: [{ open: '10:00', close: '22:00' }],
          fri: [{ open: '10:00', close: '22:00' }],
          sat: [{ open: '10:00', close: '22:00' }],
          sun: [{ open: '10:00', close: '22:00' }],
        },
        googleMapsUrl: 'https://maps.google.com/?q=Bankara+Ramen+Bangkok',
      },
    }),

    // Italian restaurants
    prisma.restaurant.create({
      data: {
        name: 'Peppina',
        nameLocal: 'เปปปิน่า',
        description: 'Neapolitan-style pizzeria with wood-fired oven and imported ingredients',
        imageUrl: 'https://images.unsplash.com/photo-1555992336-fb0d29498b13?w=800',
        latitude: 13.7280,
        longitude: 100.5695,
        address: '27/1 Soi Sukhumvit 33, Khlong Toei Nuea, Watthana, Bangkok 10110',
        priceLevel: 3,
        rating: 4.4,
        reviewCount: 1123,
        phone: '+66 2 119 7677',
        openingHours: {
          mon: [{ open: '11:30', close: '22:30' }],
          tue: [{ open: '11:30', close: '22:30' }],
          wed: [{ open: '11:30', close: '22:30' }],
          thu: [{ open: '11:30', close: '22:30' }],
          fri: [{ open: '11:30', close: '23:00' }],
          sat: [{ open: '11:30', close: '23:00' }],
          sun: [{ open: '11:30', close: '22:30' }],
        },
        googleMapsUrl: 'https://maps.google.com/?q=Peppina+Bangkok',
      },
    }),

    // Korean restaurants
    prisma.restaurant.create({
      data: {
        name: 'Bonchon Chicken',
        nameLocal: 'บอนชอน ชิคเก้น',
        description: 'Korean fried chicken chain known for double-fried crispy chicken',
        imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800',
        latitude: 13.7460,
        longitude: 100.5320,
        address: 'Central World, 999/9 Rama I Rd, Pathum Wan, Bangkok 10330',
        priceLevel: 2,
        rating: 4.1,
        reviewCount: 2156,
        phone: '+66 2 100 9699',
        openingHours: {
          mon: [{ open: '10:00', close: '22:00' }],
          tue: [{ open: '10:00', close: '22:00' }],
          wed: [{ open: '10:00', close: '22:00' }],
          thu: [{ open: '10:00', close: '22:00' }],
          fri: [{ open: '10:00', close: '22:00' }],
          sat: [{ open: '10:00', close: '22:00' }],
          sun: [{ open: '10:00', close: '22:00' }],
        },
        googleMapsUrl: 'https://maps.google.com/?q=Bonchon+Central+World+Bangkok',
      },
    }),

    // Chinese restaurant
    prisma.restaurant.create({
      data: {
        name: 'Din Tai Fung',
        nameLocal: 'ติ่นไท่ฟง',
        description: 'Famous Taiwanese chain known for xiaolongbao (soup dumplings)',
        imageUrl: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800',
        latitude: 13.7455,
        longitude: 100.5340,
        address: 'CentralWorld, 999/9 Rama I Rd, Pathum Wan, Bangkok 10330',
        priceLevel: 3,
        rating: 4.5,
        reviewCount: 3421,
        phone: '+66 2 646 1288',
        openingHours: {
          mon: [{ open: '10:00', close: '22:00' }],
          tue: [{ open: '10:00', close: '22:00' }],
          wed: [{ open: '10:00', close: '22:00' }],
          thu: [{ open: '10:00', close: '22:00' }],
          fri: [{ open: '10:00', close: '22:00' }],
          sat: [{ open: '10:00', close: '22:00' }],
          sun: [{ open: '10:00', close: '22:00' }],
        },
        googleMapsUrl: 'https://maps.google.com/?q=Din+Tai+Fung+Bangkok',
      },
    }),
  ]);

  console.log(`Created ${restaurants.length} restaurants`);

  // Create restaurant-menu mappings
  const menuMap = new Map(menus.map(m => [m.name, m]));
  const restaurantMap = new Map(restaurants.map(r => [r.name, r]));

  const mappings = [
    // Thipsamai serves Thai food
    { restaurant: 'Thipsamai', menu: 'Pad Thai', price: 100 },
    { restaurant: 'Thipsamai', menu: 'Som Tam', price: 80 },

    // Jay Fai
    { restaurant: 'Jay Fai', menu: 'Pad Thai', price: 200 },
    { restaurant: 'Jay Fai', menu: 'Tom Yum Goong', price: 350 },

    // Somtum Der
    { restaurant: 'Somtum Der', menu: 'Som Tam', price: 90 },
    { restaurant: 'Somtum Der', menu: 'Green Curry', price: 150 },
    { restaurant: 'Somtum Der', menu: 'Mango Sticky Rice', price: 100 },

    // Sushi Hiro
    { restaurant: 'Sushi Hiro', menu: 'Salmon Sashimi', price: 450 },
    { restaurant: 'Sushi Hiro', menu: 'Salmon Don', price: 380 },

    // Bankara Ramen
    { restaurant: 'Bankara Ramen', menu: 'Tonkotsu Ramen', price: 280 },
    { restaurant: 'Bankara Ramen', menu: 'Gyoza', price: 150 },
    { restaurant: 'Bankara Ramen', menu: 'Chicken Katsu Curry', price: 250 },

    // Peppina
    { restaurant: 'Peppina', menu: 'Margherita Pizza', price: 350 },
    { restaurant: 'Peppina', menu: 'Carbonara', price: 380 },
    { restaurant: 'Peppina', menu: 'Tiramisu', price: 220 },

    // Bonchon
    { restaurant: 'Bonchon Chicken', menu: 'Korean Fried Chicken', price: 350 },

    // Din Tai Fung
    { restaurant: 'Din Tai Fung', menu: 'Dim Sum Set', price: 450 },
    { restaurant: 'Din Tai Fung', menu: 'Mapo Tofu', price: 220 },
  ];

  for (const mapping of mappings) {
    const restaurant = restaurantMap.get(mapping.restaurant);
    const menu = menuMap.get(mapping.menu);

    if (restaurant && menu) {
      await prisma.restaurantMenu.create({
        data: {
          restaurantId: restaurant.id,
          menuId: menu.id,
          price: mapping.price,
          isAvailable: true,
        },
      });
    }
  }

  console.log(`Created ${mappings.length} restaurant-menu mappings`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
