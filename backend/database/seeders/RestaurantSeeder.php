<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Restaurant;
use App\Models\User;
use App\Models\Category;
use App\Models\Cuisine;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Addon;

class RestaurantSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::where('email', 'owner@fuegotrattoria.com')->first();
        $catPizza = Category::where('slug', 'artisan-pizza')->first();
        $catBurgers = Category::where('slug', 'craft-burgers')->first();
        $catSushi = Category::where('slug', 'japanese-sushi')->first();
        $catDesserts = Category::where('slug', 'desserts-bakes')->first();
        $catBeverages = Category::where('slug', 'artisan-beverages')->first();

        // Restaurant 1: Fuego Wood-Fired Trattoria
        $fuego = Restaurant::firstOrCreate(
            ['slug' => 'fuego-wood-fired-trattoria'],
            [
                'owner_id' => $owner->id,
                'name' => 'Fuego Wood-Fired Trattoria',
                'description' => 'Neapolitan sourdough pizzas with 72-hour slow fermentation, hand-stretched mozzarella, and organic San Marzano tomatoes baked in a 900-degree stone oven.',
                'cover_image' => '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg',
                'address' => '42 Heritage Boulevard, Block 5',
                'city' => 'Lahore',
                'area' => 'Gulberg III',
                'lat' => 31.5204,
                'lng' => 74.3587,
                'rating' => 4.9,
                'review_count' => 284,
                'delivery_fee' => 120.00,
                'minimum_order' => 800.00,
                'estimated_delivery_time' => '25-35 min',
                'is_open' => true,
                'is_featured' => true,
                'discount_badge' => '20% Off Menu',
                'commission_rate' => 15.00,
                'commission_type' => 'percentage',
                'status' => 'approved',
                'phone' => '+92 42 3578 9901',
                'email' => 'contact@fuegotrattoria.com',
            ]
        );

        $fuego->cuisines()->sync(Cuisine::whereIn('slug', ['italian', 'wood-fired-pizza'])->pluck('id'));

        // Restaurant 2: The Iron Grill & Smash
        $ironGrill = Restaurant::firstOrCreate(
            ['slug' => 'the-iron-grill-and-smash'],
            [
                'owner_id' => $owner->id,
                'name' => 'The Iron Grill & Smash',
                'description' => 'Hand-smashed prime dry-aged beef patties, melted artisanal Wisconsin cheddar, crispy buttered brioche buns, and house secret smoked aioli.',
                'cover_image' => '/src/assets/images/restaurant_craft_burger_1790680534475.jpg',
                'address' => '18 Commercial Avenue, Phase 5',
                'city' => 'Lahore',
                'area' => 'DHA Phase 5',
                'lat' => 31.4728,
                'lng' => 74.3985,
                'rating' => 4.8,
                'review_count' => 341,
                'delivery_fee' => 140.00,
                'minimum_order' => 650.00,
                'estimated_delivery_time' => '20-30 min',
                'is_open' => true,
                'is_featured' => true,
                'discount_badge' => 'Free Delivery over Rs. 1500',
                'commission_rate' => 14.00,
                'commission_type' => 'percentage',
                'status' => 'approved',
                'phone' => '+92 42 3712 4455',
                'email' => 'orders@theirongrill.com',
            ]
        );

        $ironGrill->cuisines()->sync(Cuisine::whereIn('slug', ['american', 'burgers', 'bbq'])->pluck('id'));

        // Restaurant 3: Kyoto Izakaya & Raw Bar
        $kyoto = Restaurant::firstOrCreate(
            ['slug' => 'kyoto-izakaya-raw-bar'],
            [
                'owner_id' => $owner->id,
                'name' => 'Kyoto Izakaya & Raw Bar',
                'description' => 'Fresh sashimi flown in weekly, traditional hand-pressed nigiri, rich slow-simmered tonkotsu broth, and authentic robata grill skewers.',
                'cover_image' => '/src/assets/images/restaurant_fresh_sushi_1790680549601.jpg',
                'address' => '97 Marina Promenade, Clifton',
                'city' => 'Karachi',
                'area' => 'Clifton Block 4',
                'lat' => 24.8182,
                'lng' => 67.0315,
                'rating' => 4.9,
                'review_count' => 198,
                'delivery_fee' => 180.00,
                'minimum_order' => 1200.00,
                'estimated_delivery_time' => '35-45 min',
                'is_open' => true,
                'is_featured' => true,
                'discount_badge' => 'Chef Selection Special',
                'commission_rate' => 16.00,
                'commission_type' => 'percentage',
                'status' => 'approved',
                'phone' => '+92 21 3589 1234',
                'email' => 'info@kyotoizakaya.pk',
            ]
        );

        $kyoto->cuisines()->sync(Cuisine::whereIn('slug', ['japanese', 'sushi'])->pluck('id'));

        // Assign staff to Fuego
        $staff = User::where('email', 'staff@fuegotrattoria.com')->first();
        if ($staff) {
            $staff->restaurant_id = $fuego->id;
            $staff->save();
        }

        // Seed Operating Hours & Delivery Zones for all 3 restaurants
        $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        foreach ([$fuego, $ironGrill, $kyoto] as $seededRest) {
            foreach ($days as $day) {
                \App\Models\RestaurantHour::firstOrCreate(
                    ['restaurant_id' => $seededRest->id, 'day_of_week' => $day],
                    [
                        'open_time' => '10:00:00',
                        'close_time' => '23:00:00',
                        'is_closed' => false,
                    ]
                );
            }

            \App\Models\RestaurantDeliveryZone::firstOrCreate(
                ['restaurant_id' => $seededRest->id, 'zone_name' => 'Downtown & Central Delivery Zone'],
                [
                    'delivery_fee' => $seededRest->delivery_fee,
                    'min_order' => $seededRest->minimum_order,
                    'is_active' => true,
                ]
            );
        }

        // Seed 30+ Products across the 3 restaurants
        $productsList = [
            // Fuego (10 items)
            ['rest' => $fuego, 'cat' => $catPizza, 'name' => 'Margherita Verace D.O.P.', 'price' => 1350, 'discount' => 1150, 'time' => 18, 'img' => '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg', 'desc' => 'San Marzano tomatoes, fresh Fior di Latte mozzarella, basil, olive oil.'],
            ['rest' => $fuego, 'cat' => $catPizza, 'name' => 'Diavola Spianata Piccante', 'price' => 1650, 'discount' => null, 'time' => 20, 'img' => '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg', 'desc' => 'Spicy beef pepperoni, Calabrian chili, smoked provolone, wild oregano.'],
            ['rest' => $fuego, 'cat' => $catPizza, 'name' => 'Tartufo & Funghi Selvatici', 'price' => 1780, 'discount' => null, 'time' => 22, 'img' => '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg', 'desc' => 'Wild cremini mushrooms, fontina cheese, white truffle cream base.'],
            ['rest' => $fuego, 'cat' => $catPizza, 'name' => 'Quattro Formaggi Bianca', 'price' => 1590, 'discount' => null, 'time' => 18, 'img' => '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg', 'desc' => 'Gorgonzola, fontina, aged parmigiano, and fresh fior di latte with wild honey.'],
            ['rest' => $fuego, 'cat' => $catPizza, 'name' => 'Calzone Napoletano Al Forno', 'price' => 1450, 'discount' => null, 'time' => 20, 'img' => '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg', 'desc' => 'Folded pizza stuffed with seasoned ricotta, smoked salami, and marinara.'],
            ['rest' => $fuego, 'cat' => $catPizza, 'name' => 'Bufalina Campana', 'price' => 1690, 'discount' => 1490, 'time' => 18, 'img' => '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg', 'desc' => 'Fresh whole imported buffalo mozzarella, slow-roasted cherry tomatoes.'],
            ['rest' => $fuego, 'cat' => $catDesserts, 'name' => 'Classic Espresso Tiramisu', 'price' => 680, 'discount' => null, 'time' => 10, 'img' => 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500', 'desc' => 'Savoiardi ladyfingers soaked in dark roast espresso and mascarpone.'],
            ['rest' => $fuego, 'cat' => $catDesserts, 'name' => 'Sicilian Pistachio Cannoli', 'price' => 590, 'discount' => null, 'time' => 8, 'img' => 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500', 'desc' => 'Crisp pastry shell filled with sweet ricotta and crushed Bronte pistachios.'],
            ['rest' => $fuego, 'cat' => $catBeverages, 'name' => 'San Pellegrino Blood Orange', 'price' => 290, 'discount' => null, 'time' => 3, 'img' => 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500', 'desc' => 'Sparkling Italian citrus soda (330ml).'],
            ['rest' => $fuego, 'cat' => $catBeverages, 'name' => 'Acqua Panna Mineral Water', 'price' => 320, 'discount' => null, 'time' => 2, 'img' => 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500', 'desc' => 'Natural Tuscan spring water (500ml).'],

            // The Iron Grill (10 items)
            ['rest' => $ironGrill, 'cat' => $catBurgers, 'name' => 'The Double Iron Smash', 'price' => 1190, 'discount' => 990, 'time' => 15, 'img' => '/src/assets/images/restaurant_craft_burger_1790680534475.jpg', 'desc' => 'Two 110g Angus beef smash patties, double American cheese, caramelized onions.'],
            ['rest' => $ironGrill, 'cat' => $catBurgers, 'name' => 'Smoked Gouda & Truffle Burger', 'price' => 1390, 'discount' => null, 'time' => 18, 'img' => '/src/assets/images/restaurant_craft_burger_1790680534475.jpg', 'desc' => 'Angus beef patty, melted smoked Dutch gouda, balsamic mushrooms, truffle mayo.'],
            ['rest' => $ironGrill, 'cat' => $catBurgers, 'name' => 'Nashville Hot Crispy Chicken', 'price' => 980, 'discount' => null, 'time' => 16, 'img' => 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500', 'desc' => 'Buttermilk chicken breast tossed in fiery Cayenne butter with cool slaw.'],
            ['rest' => $ironGrill, 'cat' => $catBurgers, 'name' => 'Bacon Jam & Blue Cheese Burger', 'price' => 1420, 'discount' => null, 'time' => 18, 'img' => '/src/assets/images/restaurant_craft_burger_1790680534475.jpg', 'desc' => 'Slow-simmered onion-beef bacon jam, gorgonzola crumble, and brioche bun.'],
            ['rest' => $ironGrill, 'cat' => $catBurgers, 'name' => 'The Triple Iron Stack', 'price' => 1590, 'discount' => null, 'time' => 18, 'img' => '/src/assets/images/restaurant_craft_burger_1790680534475.jpg', 'desc' => 'Three smashed Angus patties, triple cheddar, and extra secret house aioli.'],
            ['rest' => $ironGrill, 'cat' => $catBurgers, 'name' => 'Parmesan Truffle Fries', 'price' => 490, 'discount' => null, 'time' => 10, 'img' => 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500', 'desc' => 'Hand-cut russet potatoes tossed in white truffle oil and Parmigiano-Reggiano.'],
            ['rest' => $ironGrill, 'cat' => $catBurgers, 'name' => 'Loaded Chili Cheese Fries', 'price' => 640, 'discount' => null, 'time' => 12, 'img' => 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500', 'desc' => 'Golden fries smothered in slow-cooked prime beef chili, melted cheddar.'],
            ['rest' => $ironGrill, 'cat' => $catBurgers, 'name' => 'Crispy Smoked Onion Rings', 'price' => 380, 'discount' => null, 'time' => 8, 'img' => 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500', 'desc' => 'Thick-cut sweet Spanish onions in beer batter with smoked barbecue dip.'],
            ['rest' => $ironGrill, 'cat' => $catBeverages, 'name' => 'Craft Vanilla Malt Shake', 'price' => 520, 'discount' => null, 'time' => 6, 'img' => 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500', 'desc' => 'Hand-spun Madagascar vanilla bean ice cream with malt crumble.'],
            ['rest' => $ironGrill, 'cat' => $catBeverages, 'name' => 'Cold Brew Nitro Coffee', 'price' => 420, 'discount' => null, 'time' => 3, 'img' => 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500', 'desc' => 'Velvety nitrogen-infused single-origin Arabica cold brew.'],

            // Kyoto Izakaya (10 items)
            ['rest' => $kyoto, 'cat' => $catSushi, 'name' => 'Kyoto Nigiri Platter (10 pcs)', 'price' => 2450, 'discount' => 2150, 'time' => 25, 'img' => '/src/assets/images/restaurant_fresh_sushi_1790680549601.jpg', 'desc' => 'Norwegian salmon, yellowfin tuna, ebi prawn, unagi, and seared scallop.'],
            ['rest' => $kyoto, 'cat' => $catSushi, 'name' => 'Spicy Salmon & Truffle Crunch Roll', 'price' => 1550, 'discount' => null, 'time' => 20, 'img' => '/src/assets/images/restaurant_fresh_sushi_1790680549601.jpg', 'desc' => 'Salmon tartare, torched belly, unagi sauce, crispy tempura flakes.'],
            ['rest' => $kyoto, 'cat' => $catSushi, 'name' => 'Tokyo Black Garlic Tonkotsu Ramen', 'price' => 1680, 'discount' => null, 'time' => 20, 'img' => 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500', 'desc' => '16-hour rich pork bone broth, wheat noodles, braised chashu, black garlic oil.'],
            ['rest' => $kyoto, 'cat' => $catSushi, 'name' => 'Salmon Sashimi Trio (9 slices)', 'price' => 1890, 'discount' => null, 'time' => 15, 'img' => '/src/assets/images/restaurant_fresh_sushi_1790680549601.jpg', 'desc' => 'Thick-cut fresh Atlantic salmon belly with real Shizuoka wasabi.'],
            ['rest' => $kyoto, 'cat' => $catSushi, 'name' => 'Dragon Roll (Eel & Avocado)', 'price' => 1750, 'discount' => null, 'time' => 22, 'img' => '/src/assets/images/restaurant_fresh_sushi_1790680549601.jpg', 'desc' => 'Shrimp tempura inside, topped with barbecued unagi eel and sliced avocado.'],
            ['rest' => $kyoto, 'cat' => $catSushi, 'name' => 'Tori Karaage with Yuzu Mayo', 'price' => 780, 'discount' => null, 'time' => 12, 'img' => 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500', 'desc' => 'Japanese crispy double-fried chicken thighs with yuzu kosho dipping sauce.'],
            ['rest' => $kyoto, 'cat' => $catSushi, 'name' => 'Spicy Edamame with Togarashi', 'price' => 450, 'discount' => null, 'time' => 8, 'img' => 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500', 'desc' => 'Steamed whole soy beans tossed in sesame oil, sea salt, and shichimi togarashi.'],
            ['rest' => $kyoto, 'cat' => $catDesserts, 'name' => 'Matcha Green Tea Crepe Cake', 'price' => 690, 'discount' => null, 'time' => 8, 'img' => 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500', 'desc' => 'Twenty layers of paper-thin French crepes with Uji matcha infused cream.'],
            ['rest' => $kyoto, 'cat' => $catBeverages, 'name' => 'Iced Roasted Genmaicha Tea', 'price' => 380, 'discount' => null, 'time' => 5, 'img' => 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500', 'desc' => 'Japanese green tea blended with toasted brown rice over ice.'],
            ['rest' => $kyoto, 'cat' => $catBeverages, 'name' => 'Japanese Ramune Lychee Soda', 'price' => 360, 'discount' => null, 'time' => 3, 'img' => 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500', 'desc' => 'Classic marble-stopper glass bottle Japanese soda.'],
        ];

        foreach ($productsList as $p) {
            $product = Product::firstOrCreate(
                ['restaurant_id' => $p['rest']->id, 'name' => $p['name']],
                [
                    'category_id' => $p['cat']->id,
                    'slug' => \Illuminate\Support\Str::slug($p['name']),
                    'description' => $p['desc'],
                    'image' => $p['img'],
                    'price' => $p['price'],
                    'discount_price' => $p['discount'],
                    'is_available' => true,
                    'preparation_time' => $p['time'],
                    'tax_rate' => 5.00,
                ]
            );

            // Add standard variants if burger or pizza
            if (str_contains(strtolower($p['name']), 'pizza') || str_contains(strtolower($p['name']), 'smash')) {
                ProductVariant::firstOrCreate(['product_id' => $product->id, 'name' => 'Standard Portion'], ['price_modifier' => 0.00]);
                ProductVariant::firstOrCreate(['product_id' => $product->id, 'name' => 'Double / Meal Combo'], ['price_modifier' => 380.00]);
            }
        }
    }
}
