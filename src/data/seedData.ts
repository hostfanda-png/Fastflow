import { 
  Restaurant, 
  Product, 
  ProductCategory, 
  User, 
  Rider, 
  Order, 
  Coupon, 
  Review, 
  AuditLog, 
  FinancialTransaction, 
  DeliveryZone, 
  Banner, 
  CMSPage, 
  SystemSettings 
} from '../types';

export const SEED_CATEGORIES: ProductCategory[] = [
  { id: 'cat-all', name: 'All Categories', icon: 'Utensils' },
  { id: 'cat-pizza', name: 'Artisan Pizza', icon: 'Pizza' },
  { id: 'cat-burgers', name: 'Craft Burgers', icon: 'Sandwich' },
  { id: 'cat-sushi', name: 'Japanese & Sushi', icon: 'Fish' },
  { id: 'cat-mexican', name: 'Mexican & Tacos', icon: 'Flame' },
  { id: 'cat-bbq', name: 'Smokehouse BBQ', icon: 'Beef' },
  { id: 'cat-desserts', name: 'Desserts & Bakes', icon: 'Cake' },
  { id: 'cat-beverages', name: 'Artisan Beverages', icon: 'Coffee' },
];

export const SEED_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-fuego',
    name: 'Fuego Wood-Fired Trattoria',
    slug: 'fuego-wood-fired-trattoria',
    logo: 'https://images.unsplash.com/photo-1579758630665-27a9446d32dc?w=160&auto=format&fit=crop&q=80',
    coverImage: '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg',
    description: 'Neapolitan sourdough pizzas with 72-hour slow fermentation, hand-stretched mozzarella, and organic San Marzano tomatoes baked in a 900-degree stone oven.',
    address: '42 Heritage Boulevard, Block 5',
    city: 'Lahore',
    area: 'Gulberg III',
    lat: 31.5204,
    lng: 74.3587,
    rating: 4.9,
    reviewCount: 284,
    deliveryFee: 120,
    minimumOrder: 800,
    estimatedDeliveryTime: '25-35 min',
    isOpen: true,
    isFeatured: true,
    discountBadge: '20% Off Menu',
    commissionRate: 15,
    commissionType: 'percentage',
    status: 'approved',
    cuisines: ['Italian', 'Wood-fired Pizza', 'Handmade Pasta'],
    phone: '+92 42 3578 9901',
    email: 'contact@fuegotrattoria.com',
    openingHours: {
      daily: { open: '12:00', close: '23:30' }
    },
    serviceRadiusKm: 10
  },
  {
    id: 'rest-iron-grill',
    name: 'The Iron Grill & Smash',
    slug: 'the-iron-grill-and-smash',
    logo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=160&auto=format&fit=crop&q=80',
    coverImage: '/src/assets/images/restaurant_craft_burger_1790680534475.jpg',
    description: 'Hand-smashed prime dry-aged beef patties, melted artisanal Wisconsin cheddar, crispy buttered brioche buns, and house secret smoked aioli.',
    address: '18 Commercial Avenue, Phase 5',
    city: 'Lahore',
    area: 'DHA Phase 5',
    lat: 31.4728,
    lng: 74.3985,
    rating: 4.8,
    reviewCount: 341,
    deliveryFee: 140,
    minimumOrder: 650,
    estimatedDeliveryTime: '20-30 min',
    isOpen: true,
    isFeatured: true,
    discountBadge: 'Free Delivery over Rs. 1500',
    commissionRate: 14,
    commissionType: 'percentage',
    status: 'approved',
    cuisines: ['Burgers', 'American', 'Craft Fries'],
    phone: '+92 42 3712 4455',
    email: 'orders@theirongrill.com',
    openingHours: {
      daily: { open: '13:00', close: '01:00' }
    },
    serviceRadiusKm: 12
  },
  {
    id: 'rest-kyoto',
    name: 'Kyoto Izakaya & Raw Bar',
    slug: 'kyoto-izakaya-raw-bar',
    logo: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=160&auto=format&fit=crop&q=80',
    coverImage: '/src/assets/images/restaurant_fresh_sushi_1790680549601.jpg',
    description: 'Fresh sashimi flown in weekly, traditional hand-pressed nigiri, rich slow-simmered tonkotsu broth, and authentic robata grill skewers.',
    address: '97 Marina Promenade, Clifton',
    city: 'Karachi',
    area: 'Clifton Block 4',
    lat: 24.8182,
    lng: 67.0315,
    rating: 4.9,
    reviewCount: 198,
    deliveryFee: 180,
    minimumOrder: 1200,
    estimatedDeliveryTime: '35-45 min',
    isOpen: true,
    isFeatured: true,
    discountBadge: 'Chef Selection Special',
    commissionRate: 16,
    commissionType: 'percentage',
    status: 'approved',
    cuisines: ['Japanese', 'Sushi', 'Ramen & Donburi'],
    phone: '+92 21 3589 1234',
    email: 'info@kyotoizakaya.pk',
    openingHours: {
      daily: { open: '12:30', close: '23:00' }
    },
    serviceRadiusKm: 14
  },
  {
    id: 'rest-taqueria',
    name: 'La Taquería Del Sol',
    slug: 'la-taqueria-del-sol',
    logo: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=160&auto=format&fit=crop&q=80',
    coverImage: '/src/assets/images/restaurant_taco_cantina_1790680561230.jpg',
    description: 'Slow-cooked birria tacos simmered in chili consommé, fresh charred corn esquites, house-pressed nixtamal corn tortillas, and craft aguas frescas.',
    address: '64 Sunset Boulevard, F-7/2',
    city: 'Islamabad',
    area: 'Sector F-7',
    lat: 33.7206,
    lng: 73.0563,
    rating: 4.7,
    reviewCount: 164,
    deliveryFee: 110,
    minimumOrder: 600,
    estimatedDeliveryTime: '25-35 min',
    isOpen: true,
    isFeatured: false,
    discountBadge: 'Taco Tuesday 15% Off',
    commissionRate: 12,
    commissionType: 'percentage',
    status: 'approved',
    cuisines: ['Mexican', 'Tacos', 'Burritos'],
    phone: '+92 51 2890 334',
    email: 'hola@taqueriadelsol.pk',
    openingHours: {
      daily: { open: '12:00', close: '00:00' }
    },
    serviceRadiusKm: 8
  }
];

export const SEED_PRODUCTS: Product[] = [
  // Fuego Wood-Fired Trattoria
  {
    id: 'prod-fuego-1',
    restaurantId: 'rest-fuego',
    categoryId: 'cat-pizza',
    name: 'Margherita Verace D.O.P.',
    description: 'San Marzano D.O.P. tomatoes, fresh Fior di Latte mozzarella, fragrant sweet basil, extra virgin olive oil, and Maldon sea salt flake.',
    image: '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg',
    price: 1350,
    discountPrice: 1150,
    isAvailable: true,
    preparationTime: 18,
    variants: [
      { id: 'v-10in', name: 'Medium (10")', priceModifier: 0 },
      { id: 'v-14in', name: 'Large (14")', priceModifier: 450 }
    ],
    addons: [
      { id: 'add-bufala', name: 'Double Buffalo Mozzarella', price: 220 },
      { id: 'add-truffle', name: 'White Truffle Oil Drizzle', price: 180 },
      { id: 'add-crust', name: 'Herb Garlic Dip', price: 110 }
    ]
  },
  {
    id: 'prod-fuego-2',
    restaurantId: 'rest-fuego',
    categoryId: 'cat-pizza',
    name: 'Diavola Spianata Piccante',
    description: 'Spicy artisanal beef pepperoni, Calabrian chili paste, smoked provolone, san marzano tomato reduction, and wild oregano.',
    image: '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg',
    price: 1650,
    isAvailable: true,
    preparationTime: 20,
    variants: [
      { id: 'v-10in-diavola', name: 'Medium (10")', priceModifier: 0 },
      { id: 'v-14in-diavola', name: 'Large (14")', priceModifier: 480 }
    ],
    addons: [
      { id: 'add-jalapenos', name: 'Pickled Jalapeños', price: 90 },
      { id: 'add-honey', name: 'Hot Chili Honey Dip', price: 140 }
    ]
  },
  {
    id: 'prod-fuego-3',
    restaurantId: 'rest-fuego',
    categoryId: 'cat-pizza',
    name: 'Tartufo & Funghi Selvatici',
    description: 'Wild forest cremini and portobello mushrooms, fontina cheese, thyme butter, white truffle cream base, and cracked peppercorn.',
    image: '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg',
    price: 1780,
    isAvailable: true,
    preparationTime: 22,
    addons: [
      { id: 'add-parm', name: 'Shaved 24-Month Parmigiano', price: 190 }
    ]
  },
  {
    id: 'prod-fuego-4',
    restaurantId: 'rest-fuego',
    categoryId: 'cat-desserts',
    name: 'Classic Espresso Tiramisu',
    description: 'Traditional savoiardi ladyfingers soaked in dark roast espresso and mascarpone zabaglione, dusted with Valrhona cocoa.',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80',
    price: 680,
    isAvailable: true,
    preparationTime: 10
  },
  {
    id: 'prod-fuego-5',
    restaurantId: 'rest-fuego',
    categoryId: 'cat-beverages',
    name: 'San Pellegrino Blood Orange',
    description: 'Sparkling Italian citrus soda with natural Mediterranean Aranciata Rossa fruit extract (330ml can).',
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&auto=format&fit=crop&q=80',
    price: 290,
    isAvailable: true,
    preparationTime: 3
  },

  // The Iron Grill & Smash
  {
    id: 'prod-grill-1',
    restaurantId: 'rest-iron-grill',
    categoryId: 'cat-burgers',
    name: 'The Double Iron Smash',
    description: 'Two 110g prime Angus beef smash patties with crispy lacy edges, double American cheese, caramelized sweet onions, dill pickles, and signature Iron sauce on brioche.',
    image: '/src/assets/images/restaurant_craft_burger_1790680534475.jpg',
    price: 1190,
    discountPrice: 990,
    isAvailable: true,
    preparationTime: 15,
    variants: [
      { id: 'v-double', name: 'Double Patty (Original)', priceModifier: 0 },
      { id: 'v-triple', name: 'Triple Patty Beast', priceModifier: 380 },
      { id: 'v-meal', name: 'Combo (With Fries & Drink)', priceModifier: 420 }
    ],
    addons: [
      { id: 'add-beef-bacon', name: 'Crispy Smoked Beef Bacon', price: 210 },
      { id: 'add-cheese', name: 'Extra Melted Cheddar Slice', price: 120 },
      { id: 'add-iron-sauce', name: 'Side Iron Secret Sauce', price: 90 }
    ]
  },
  {
    id: 'prod-grill-2',
    restaurantId: 'rest-iron-grill',
    categoryId: 'cat-burgers',
    name: 'Smoked Gouda & Truffle Burger',
    description: 'Thick Angus beef patty, melted smoked Dutch gouda, sautéed balsamic wild mushrooms, baby arugula, and black truffle mayo.',
    image: '/src/assets/images/restaurant_craft_burger_1790680534475.jpg',
    price: 1390,
    isAvailable: true,
    preparationTime: 18,
    variants: [
      { id: 'v-single-gouda', name: 'Standard Single', priceModifier: 0 },
      { id: 'v-combo-gouda', name: 'Make it a Combo', priceModifier: 420 }
    ]
  },
  {
    id: 'prod-grill-3',
    restaurantId: 'rest-iron-grill',
    categoryId: 'cat-burgers',
    name: 'Nashville Hot Crispy Chicken',
    description: 'Buttermilk marinated crunchy chicken breast tossed in fiery Cayenne chili butter, cool creamy slaw, pickles, and brioche bun.',
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=80',
    price: 980,
    isAvailable: true,
    preparationTime: 16,
    addons: [
      { id: 'add-extra-hot', name: 'Extra Fiery Reaper Dust', price: 60 }
    ]
  },
  {
    id: 'prod-grill-4',
    restaurantId: 'rest-iron-grill',
    categoryId: 'cat-burgers',
    name: 'Parmesan Truffle Fries',
    description: 'Hand-cut skin-on Idaho russet potatoes tossed in fragrant white truffle oil, grated aged parmigiano-reggiano, and minced parsley.',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80',
    price: 490,
    isAvailable: true,
    preparationTime: 10
  },

  // Kyoto Izakaya & Raw Bar
  {
    id: 'prod-kyoto-1',
    restaurantId: 'rest-kyoto',
    categoryId: 'cat-sushi',
    name: 'Signature Kyoto Nigiri Platter (10 pcs)',
    description: 'Chef selection of Norwegian salmon, yellowfin tuna, sweet ebi prawn, unagi eel, and seared scallop with house nikiri glaze.',
    image: '/src/assets/images/restaurant_fresh_sushi_1790680549601.jpg',
    price: 2450,
    discountPrice: 2150,
    isAvailable: true,
    preparationTime: 25,
    addons: [
      { id: 'add-real-wasabi', name: 'Fresh Grated Shizuoka Wasabi', price: 250 },
      { id: 'add-miso', name: 'Red Miso Soup with Tofu', price: 290 }
    ]
  },
  {
    id: 'prod-kyoto-2',
    restaurantId: 'rest-kyoto',
    categoryId: 'cat-sushi',
    name: 'Spicy Salmon & Truffle Crunch Roll',
    description: 'Fresh salmon tartare, cucumber, avocado, rolled in toasted sesame, topped with torched salmon belly, spicy unagi sauce, and crispy tempura flakes.',
    image: '/src/assets/images/restaurant_fresh_sushi_1790680549601.jpg',
    price: 1550,
    isAvailable: true,
    preparationTime: 20
  },
  {
    id: 'prod-kyoto-3',
    restaurantId: 'rest-kyoto',
    categoryId: 'cat-sushi',
    name: 'Tokyo Black Garlic Tonkotsu Ramen',
    description: '16-hour rich pork bone broth (or rich chicken broth alternative), springy wheat noodles, slow-braised chashu, soft ajitsuke tamago, and charred black garlic oil.',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80',
    price: 1680,
    isAvailable: true,
    preparationTime: 20,
    variants: [
      { id: 'v-mild', name: 'Traditional Broth', priceModifier: 0 },
      { id: 'v-spicy', name: 'Extra Spicy Chili Rayu', priceModifier: 80 }
    ]
  },

  // La Taquería Del Sol
  {
    id: 'prod-taco-1',
    restaurantId: 'rest-taqueria',
    categoryId: 'cat-mexican',
    name: 'Birria QuesaTacos Trio',
    description: 'Three crispy corn tortillas dipped in chili oil, stuffed with 8-hour braised beef shank, melted Oaxaca cheese, served with rich beef dipping broth, limes, and salsa.',
    image: '/src/assets/images/restaurant_taco_cantina_1790680561230.jpg',
    price: 1250,
    discountPrice: 1090,
    isAvailable: true,
    preparationTime: 18,
    addons: [
      { id: 'add-guac', name: 'House Fresh Guacamole', price: 240 },
      { id: 'add-consome', name: 'Extra Cup of Rich Consomé', price: 150 }
    ]
  },
  {
    id: 'prod-taco-2',
    restaurantId: 'rest-taqueria',
    categoryId: 'cat-mexican',
    name: 'Charred Street Corn Esquites',
    description: 'Sweet off-the-cob corn sautéed in butter with chipotle crema, cotija cheese, fresh cilantro, and smoked tajín chili dust.',
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=500&auto=format&fit=crop&q=80',
    price: 520,
    isAvailable: true,
    preparationTime: 12
  },
  {
    id: 'prod-taco-3',
    restaurantId: 'rest-taqueria',
    categoryId: 'cat-beverages',
    name: 'Hibiscus Agua de Jamaica',
    description: 'Chilled steeped Mexican hibiscus flower infusion with cinnamon bark, pure cane sugar, and fresh lime juice.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    price: 340,
    isAvailable: true,
    preparationTime: 5
  }
];

export const DEMO_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Eleanor Vance',
    email: 'admin@dineflow.app',
    phone: '+92 300 1234567',
    role: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    permissions: [
      'admin.view',
      'admin.manage',
      'restaurant.view',
      'restaurant.create',
      'restaurant.update',
      'restaurant.delete',
      'restaurant.approve',
      'menu.view',
      'menu.create',
      'menu.update',
      'menu.delete',
      'order.view',
      'order.create',
      'order.update',
      'order.cancel',
      'rider.view',
      'rider.assign',
      'rider.manage',
      'customer.view',
      'customer.manage',
      'coupon.manage',
      'payment.manage',
      'report.view',
      'settings.manage'
    ]
  },
  {
    id: 'user-owner',
    name: 'Marco Rossi',
    email: 'marco@fuegotrattoria.com',
    phone: '+92 321 8899001',
    role: 'restaurant_owner',
    restaurantId: 'rest-fuego',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    permissions: [
      'restaurant.view',
      'restaurant.update',
      'menu.view',
      'menu.create',
      'menu.update',
      'menu.delete',
      'order.view',
      'order.update',
      'report.view'
    ]
  },
  {
    id: 'user-staff',
    name: 'Sofia Chen',
    email: 'sofia@fuegotrattoria.com',
    phone: '+92 333 4455667',
    role: 'restaurant_staff',
    restaurantId: 'rest-fuego',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    permissions: [
      'menu.view',
      'order.view',
      'order.update'
    ]
  },
  {
    id: 'user-rider',
    name: 'Tariq Mansoor',
    email: 'tariq.rider@dineflow.app',
    phone: '+92 312 9988776',
    role: 'delivery_rider',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    permissions: [
      'rider.view',
      'order.view',
      'order.update'
    ]
  },
  {
    id: 'user-customer',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    phone: '+92 301 5556677',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    permissions: [
      'order.view',
      'order.create',
      'order.cancel'
    ]
  }
];

export const SEED_RIDERS: Rider[] = [
  {
    id: 'rider-tariq',
    userId: 'user-rider',
    name: 'Tariq Mansoor',
    phone: '+92 312 9988776',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    vehicle: 'Motorcycle',
    vehicleNumber: 'LEK-2024-81',
    status: 'available',
    currentLat: 31.5215,
    currentLng: 74.3570,
    assignedOrderCount: 1,
    totalDeliveries: 428,
    rating: 4.9,
    todayEarnings: 2840,
    totalEarnings: 94800,
    commissionPerDelivery: 100
  },
  {
    id: 'rider-bilal',
    userId: 'user-bilal',
    name: 'Bilal Ahmed',
    phone: '+92 322 1122334',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
    vehicle: 'Motorcycle',
    vehicleNumber: 'LEB-2023-19',
    status: 'available',
    currentLat: 31.4740,
    currentLng: 74.3950,
    assignedOrderCount: 0,
    totalDeliveries: 312,
    rating: 4.8,
    todayEarnings: 1950,
    totalEarnings: 68400,
    commissionPerDelivery: 100
  },
  {
    id: 'rider-hamza',
    userId: 'user-hamza',
    name: 'Hamza Farooq',
    phone: '+92 334 7788990',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80',
    vehicle: 'Scooter',
    vehicleNumber: 'KHI-2025-04',
    status: 'busy',
    currentLat: 24.8190,
    currentLng: 67.0330,
    assignedOrderCount: 1,
    totalDeliveries: 189,
    rating: 4.7,
    todayEarnings: 1400,
    totalEarnings: 41200,
    commissionPerDelivery: 100
  }
];

export const SEED_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'FD-20260929-001001',
    customerId: 'user-customer',
    customerName: 'Sarah Jenkins',
    customerPhone: '+92 301 5556677',
    deliveryAddress: {
      id: 'addr-1',
      label: 'Home',
      street: 'House 44-B, Street 12, Sector Y',
      area: 'DHA Phase 3',
      city: 'Lahore',
      lat: 31.4812,
      lng: 74.3821,
      deliveryInstructions: 'Ring doorbell, leave with gate security if unanswered.'
    },
    restaurantId: 'rest-fuego',
    restaurantName: 'Fuego Wood-Fired Trattoria',
    items: [
      {
        id: 'oi-1',
        productId: 'prod-fuego-1',
        productName: 'Margherita Verace D.O.P.',
        quantity: 1,
        unitPrice: 1150,
        totalPrice: 1330,
        variantName: 'Medium (10")',
        addons: [{ name: 'White Truffle Oil Drizzle', price: 180 }]
      },
      {
        id: 'oi-2',
        productId: 'prod-fuego-4',
        productName: 'Classic Espresso Tiramisu',
        quantity: 1,
        unitPrice: 680,
        totalPrice: 680
      }
    ],
    subtotal: 2010,
    discount: 100,
    couponCode: 'FEAST100',
    deliveryFee: 120,
    tax: 100,
    serviceFee: 30,
    tip: 100,
    grandTotal: 2260,
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    orderStatus: 'on_the_way',
    riderId: 'rider-tariq',
    riderName: 'Tariq Mansoor',
    riderPhone: '+92 312 9988776',
    statusHistory: [
      { status: 'pending', timestamp: '2026-09-29T10:14:00Z', note: 'Customer placed order via COD' },
      { status: 'confirmed', timestamp: '2026-09-29T10:15:30Z', note: 'Kitchen accepted order' },
      { status: 'preparing', timestamp: '2026-09-29T10:17:00Z', note: 'Chef began wood-fire prep' },
      { status: 'ready_for_pickup', timestamp: '2026-09-29T10:35:00Z', note: 'Boxed and heat-sealed' },
      { status: 'assigned_to_rider', timestamp: '2026-09-29T10:36:00Z', note: 'Assigned to Tariq Mansoor' },
      { status: 'picked_up', timestamp: '2026-09-29T10:41:00Z', note: 'Rider picked up from counter' },
      { status: 'on_the_way', timestamp: '2026-09-29T10:43:00Z', note: 'Rider en route to delivery address' }
    ],
    createdAt: '2026-09-29T10:14:00Z',
    estimatedDeliveryTime: '20-25 mins',
    hasBeenReviewed: false
  },
  {
    id: 'ord-1002',
    orderNumber: 'FD-20260928-000984',
    customerId: 'user-customer',
    customerName: 'Sarah Jenkins',
    customerPhone: '+92 301 5556677',
    deliveryAddress: {
      id: 'addr-1',
      label: 'Home',
      street: 'House 44-B, Street 12, Sector Y',
      area: 'DHA Phase 3',
      city: 'Lahore',
      lat: 31.4812,
      lng: 74.3821
    },
    restaurantId: 'rest-iron-grill',
    restaurantName: 'The Iron Grill & Smash',
    items: [
      {
        id: 'oi-3',
        productId: 'prod-grill-1',
        productName: 'The Double Iron Smash',
        quantity: 2,
        unitPrice: 990,
        totalPrice: 2400,
        variantName: 'Double Patty (Original)',
        addons: [{ name: 'Crispy Smoked Beef Bacon', price: 210 }]
      },
      {
        id: 'oi-4',
        productId: 'prod-grill-4',
        productName: 'Parmesan Truffle Fries',
        quantity: 1,
        unitPrice: 490,
        totalPrice: 490
      }
    ],
    subtotal: 2890,
    discount: 0,
    deliveryFee: 140,
    tax: 144,
    serviceFee: 30,
    tip: 50,
    grandTotal: 3254,
    paymentMethod: 'stripe',
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    riderId: 'rider-bilal',
    riderName: 'Bilal Ahmed',
    riderPhone: '+92 322 1122334',
    statusHistory: [
      { status: 'pending', timestamp: '2026-09-28T19:02:00Z' },
      { status: 'confirmed', timestamp: '2026-09-28T19:03:00Z' },
      { status: 'preparing', timestamp: '2026-09-28T19:05:00Z' },
      { status: 'ready_for_pickup', timestamp: '2026-09-28T19:22:00Z' },
      { status: 'picked_up', timestamp: '2026-09-28T19:28:00Z' },
      { status: 'delivered', timestamp: '2026-09-28T19:49:00Z', note: 'Customer signed for delivery' }
    ],
    createdAt: '2026-09-28T19:02:00Z',
    estimatedDeliveryTime: 'Delivered',
    hasBeenReviewed: true
  }
];

export const SEED_COUPONS: Coupon[] = [
  {
    id: 'c-welcome',
    code: 'WELCOME50',
    discountType: 'percentage',
    discountValue: 50,
    minOrder: 800,
    maxDiscount: 400,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    usageLimit: 1000,
    timesUsed: 142,
    isActive: true,
    description: '50% off on your first order up to Rs. 400'
  },
  {
    id: 'c-feast',
    code: 'FEAST100',
    discountType: 'fixed',
    discountValue: 100,
    minOrder: 1000,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    usageLimit: 2500,
    timesUsed: 593,
    isActive: true,
    description: 'Flat Rs. 100 discount on orders over Rs. 1,000'
  },
  {
    id: 'c-freedel',
    code: 'FREEDEL',
    discountType: 'fixed',
    discountValue: 120,
    minOrder: 1200,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    usageLimit: 500,
    timesUsed: 89,
    isActive: true,
    description: 'Free delivery voucher for orders above Rs. 1,200'
  }
];

export const SEED_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    orderId: 'ord-1002',
    restaurantId: 'rest-iron-grill',
    customerName: 'Sarah Jenkins',
    rating: 5,
    foodRating: 5,
    comment: 'The smash patties had incredible crust and arrived piping hot! The truffle fries were perfectly crispy. Best burger in Lahore by far.',
    createdAt: '2026-09-28T20:15:00Z',
    isApproved: true
  },
  {
    id: 'rev-2',
    orderId: 'ord-998',
    restaurantId: 'rest-fuego',
    customerName: 'Kamran Tariq',
    rating: 5,
    foodRating: 5,
    comment: 'Real authentic Neapolitan wood-fired dough. You can taste the quality San Marzano tomatoes. Fast courier delivery!',
    createdAt: '2026-09-27T14:30:00Z',
    isApproved: true
  },
  {
    id: 'rev-3',
    orderId: 'ord-992',
    restaurantId: 'rest-kyoto',
    customerName: 'Ayesha Siddiqui',
    rating: 5,
    foodRating: 5,
    comment: 'Salmon nigiri melts in the mouth, presented beautifully in insulated thermal box. Worth every rupee.',
    createdAt: '2026-09-26T21:10:00Z',
    isApproved: true
  }
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'user-admin',
    userName: 'Eleanor Vance',
    role: 'super_admin',
    action: 'restaurant.approve',
    module: 'Restaurants',
    recordId: 'rest-taqueria',
    ip: '192.168.1.1',
    timestamp: '2026-09-25T11:20:00Z',
    details: 'Approved restaurant application after food safety certificate validation.'
  },
  {
    id: 'log-2',
    userId: 'user-admin',
    userName: 'Eleanor Vance',
    role: 'super_admin',
    action: 'commission.update',
    module: 'Settings',
    recordId: 'rest-iron-grill',
    ip: '192.168.1.1',
    timestamp: '2026-09-26T09:15:00Z',
    details: 'Adjusted partner commission tier to 14% based on high order throughput.'
  },
  {
    id: 'log-3',
    userId: 'user-owner',
    userName: 'Marco Rossi',
    role: 'restaurant_owner',
    action: 'menu.update',
    module: 'Menu',
    recordId: 'prod-fuego-1',
    ip: '192.168.1.45',
    timestamp: '2026-09-28T08:30:00Z',
    details: 'Updated Margherita promotional discount price to Rs. 1,150.'
  }
];

export const SEED_FINANCIALS: FinancialTransaction[] = [
  {
    id: 'fin-1',
    orderId: 'ord-1002',
    orderNumber: 'FD-20260928-000984',
    restaurantId: 'rest-iron-grill',
    restaurantName: 'The Iron Grill & Smash',
    grossAmount: 3254,
    platformCommission: 404,
    restaurantPayout: 2486,
    deliveryFee: 140,
    riderPayout: 100,
    paymentGatewayFee: 65,
    status: 'settled',
    createdAt: '2026-09-28T19:50:00Z'
  },
  {
    id: 'fin-2',
    orderId: 'ord-1001',
    orderNumber: 'FD-20260929-001001',
    restaurantId: 'rest-fuego',
    restaurantName: 'Fuego Wood-Fired Trattoria',
    grossAmount: 2260,
    platformCommission: 301,
    restaurantPayout: 1709,
    deliveryFee: 120,
    riderPayout: 100,
    paymentGatewayFee: 0,
    status: 'pending',
    createdAt: '2026-09-29T10:14:00Z'
  }
];

export const SEED_DELIVERY_ZONES: DeliveryZone[] = [
  { id: 'zone-lhr-1', name: 'Gulberg & Downtown', city: 'Lahore', radiusKm: 8, baseFee: 120, perKmFee: 15, isActive: true },
  { id: 'zone-lhr-2', name: 'DHA & Cantt Sector', city: 'Lahore', radiusKm: 12, baseFee: 140, perKmFee: 18, isActive: true },
  { id: 'zone-khi-1', name: 'Clifton & Defence', city: 'Karachi', radiusKm: 14, baseFee: 180, perKmFee: 20, isActive: true },
  { id: 'zone-isb-1', name: 'Blue Area & Sectors F/G', city: 'Islamabad', radiusKm: 10, baseFee: 110, perKmFee: 14, isActive: true }
];

export const SEED_BANNERS: Banner[] = [
  {
    id: 'ban-1',
    title: 'Artisan Wood-Fired Week',
    subtitle: 'Taste crisp blistered crusts & fresh buffalo mozzarella with 20% off',
    badge: 'Limited Time',
    imageUrl: '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg',
    buttonText: 'Order Neapolitan Pizza',
    buttonUrl: '#restaurants',
    isActive: true
  },
  {
    id: 'ban-2',
    title: 'Double Prime Smashes',
    subtitle: 'Dry-aged beef smashed hot on iron plancha with smoked cheddar & bacon',
    badge: 'Popular',
    imageUrl: '/src/assets/images/restaurant_craft_burger_1790680534475.jpg',
    buttonText: 'View Smash Burgers',
    buttonUrl: '#restaurants',
    isActive: true
  }
];

export const SEED_CMS_PAGES: CMSPage[] = [
  {
    slug: 'about-us',
    title: 'About Fastflow Marketplace',
    content: 'Fastflow is an enterprise-grade multi-vendor food delivery infrastructure connecting top independent culinary artisans, wood-fired pizzerias, smash burger joints, and sushi houses with discerning diners. Our real-time dispatch network empowers local restaurateurs with transparent commission tiers, dedicated staff consoles, and swift contactless deliveries.',
    lastUpdated: 'September 2026'
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    content: 'Q: How does Fastflow handle delivery from multiple restaurants?\nA: To guarantee peak freshness, each active cart is tied to a single kitchen. If you select items from a new venue, our system prompts you to complete or replace your current cart.\n\nQ: What payment methods are supported?\nA: Fastflow supports Cash on Delivery (COD) as well as secure online credit/debit card processing via Stripe interface abstraction.\n\nQ: How can I register my restaurant?\nA: Submit an application through the partner portal. Our culinary verification team reviews food safety licenses and menus within 24-48 business hours.',
    lastUpdated: 'September 2026'
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    content: 'By accessing the Fastflow platform, you agree to comply with our fair marketplace policies. Orders are binding once confirmed by partner kitchens. Food preparation standards, ingredient sourcing, and allergen notifications remain the direct operational responsibility of participating restaurants. Fastflow enforces secure end-to-end data encryption and strict RBAC authorization.',
    lastUpdated: 'September 2026'
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    content: 'Fastflow is committed to customer data security. We collect customer delivery coordinates solely for routing deliveries and verifying service zones. Sensitive payment credentials never touch our core database servers and are tokenized via certified PCI-compliant gateway abstractions. We never sell customer information to third-party ad networks.',
    lastUpdated: 'September 2026'
  },
  {
    slug: 'refund-policy',
    title: 'Refund & Cancellation Policy',
    content: 'Orders may be cancelled free of charge while in "Pending" status prior to kitchen confirmation. If an order arrives damaged, missing key items, or delayed beyond acceptable thresholds, customers can request an immediate audit review through customer support. Authorized refunds are processed back to the original payment method or credited to wallet balance within 2-3 business days.',
    lastUpdated: 'September 2026'
  }
];

export const SEED_SETTINGS: SystemSettings = {
  appName: 'Fastflow',
  currencyCode: 'PKR',
  currencySymbol: 'Rs.',
  decimalPlaces: 0,
  thousandSeparator: ',',
  decimalSeparator: '.',
  taxPercentage: 5,
  serviceFee: 30,
  baseDeliveryFee: 120,
  defaultCommissionRate: 15,
  activeLanguage: 'en'
};
