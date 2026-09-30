<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Cuisine;

class CategoryProductSeeder extends Seeder
{
    public function run(): void
    {
        // 10+ Categories
        $categories = [
            ['name' => 'Artisan Pizza', 'slug' => 'artisan-pizza', 'icon' => 'Pizza', 'sort_order' => 1],
            ['name' => 'Craft Burgers', 'slug' => 'craft-burgers', 'icon' => 'Sandwich', 'sort_order' => 2],
            ['name' => 'Japanese & Sushi', 'slug' => 'japanese-sushi', 'icon' => 'Fish', 'sort_order' => 3],
            ['name' => 'Mexican & Tacos', 'slug' => 'mexican-tacos', 'icon' => 'Flame', 'sort_order' => 4],
            ['name' => 'Smokehouse BBQ', 'slug' => 'smokehouse-bbq', 'icon' => 'Beef', 'sort_order' => 5],
            ['name' => 'Handmade Pasta', 'slug' => 'handmade-pasta', 'icon' => 'Utensils', 'sort_order' => 6],
            ['name' => 'Desserts & Bakes', 'slug' => 'desserts-bakes', 'icon' => 'Cake', 'sort_order' => 7],
            ['name' => 'Artisan Beverages', 'slug' => 'artisan-beverages', 'icon' => 'Coffee', 'sort_order' => 8],
            ['name' => 'Salads & Bowls', 'slug' => 'salads-bowls', 'icon' => 'Utensils', 'sort_order' => 9],
            ['name' => 'Appetizers & Sides', 'slug' => 'appetizers-sides', 'icon' => 'Utensils', 'sort_order' => 10],
            ['name' => 'Breakfast & Brunch', 'slug' => 'breakfast-brunch', 'icon' => 'Coffee', 'sort_order' => 11],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(['slug' => $cat['slug']], $cat);
        }

        // Cuisines
        $cuisines = [
            ['name' => 'Italian', 'slug' => 'italian'],
            ['name' => 'American', 'slug' => 'american'],
            ['name' => 'Japanese', 'slug' => 'japanese'],
            ['name' => 'Mexican', 'slug' => 'mexican'],
            ['name' => 'Wood-fired Pizza', 'slug' => 'wood-fired-pizza'],
            ['name' => 'Burgers', 'slug' => 'burgers'],
            ['name' => 'Sushi', 'slug' => 'sushi'],
            ['name' => 'BBQ', 'slug' => 'bbq'],
            ['name' => 'Pakistani', 'slug' => 'pakistani'],
            ['name' => 'Chinese', 'slug' => 'chinese'],
            ['name' => 'Fast Food', 'slug' => 'fast-food'],
            ['name' => 'Pizza', 'slug' => 'pizza'],
            ['name' => 'Desserts', 'slug' => 'desserts'],
            ['name' => 'Breakfast', 'slug' => 'breakfast'],
        ];

        foreach ($cuisines as $c) {
            Cuisine::firstOrCreate(['slug' => $c['slug']], $c);
        }
    }
}
