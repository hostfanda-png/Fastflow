<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;
use App\Models\DeliveryZone;
use App\Models\Banner;
use App\Models\Page;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'app_name' => 'Fastflow',
            'currency_code' => 'PKR',
            'currency_symbol' => 'Rs.',
            'default_tax_percentage' => '5',
            'default_commission_rate' => '15',
            'default_base_delivery_fee' => '120',
            'default_service_fee' => '30',
        ];

        foreach ($settings as $k => $v) {
            Setting::set($k, $v);
        }

        // Delivery Zones
        DeliveryZone::firstOrCreate(
            ['name' => 'Gulberg & Downtown Sector', 'city' => 'Lahore'],
            ['radius_km' => 8.0, 'base_fee' => 120.00, 'per_km_fee' => 15.00, 'is_active' => true]
        );
        DeliveryZone::firstOrCreate(
            ['name' => 'DHA & Cantt Sector', 'city' => 'Lahore'],
            ['radius_km' => 12.0, 'base_fee' => 140.00, 'per_km_fee' => 18.00, 'is_active' => true]
        );
        DeliveryZone::firstOrCreate(
            ['name' => 'Clifton & Defence Zone', 'city' => 'Karachi'],
            ['radius_km' => 14.0, 'base_fee' => 180.00, 'per_km_fee' => 20.00, 'is_active' => true]
        );

        // Banners
        Banner::firstOrCreate(
            ['title' => 'Artisan Wood-Fired Week'],
            [
                'subtitle' => 'Taste crisp blistered crusts & fresh buffalo mozzarella with 20% off',
                'badge' => 'Chef Special',
                'image_url' => '/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg',
                'button_text' => 'Order Neapolitan Pizza',
                'button_url' => '#restaurants',
                'is_active' => true,
            ]
        );

        // CMS Pages
        Page::firstOrCreate(
            ['slug' => 'about-us'],
            [
                'title' => 'About Fastflow Marketplace',
                'content' => 'Fastflow is an enterprise-grade multi-vendor food delivery infrastructure connecting top independent culinary artisans, wood-fired pizzerias, smash burger joints, and sushi houses with discerning diners. Our real-time dispatch network empowers local restaurateurs with transparent commission tiers, dedicated staff consoles, and swift contactless deliveries.',
                'meta_title' => 'About Fastflow Food Marketplace',
                'meta_description' => 'Learn about our multi-vendor food delivery platform and culinary standards.',
                'is_published' => true,
            ]
        );

        Page::firstOrCreate(
            ['slug' => 'faq'],
            [
                'title' => 'Frequently Asked Questions',
                'content' => "Q: How does Fastflow handle delivery from multiple restaurants?\nA: To guarantee peak freshness, each active cart is tied to a single kitchen. If you select items from a new venue, our system prompts you to complete or replace your current cart.\n\nQ: What payment methods are supported?\nA: Fastflow supports Cash on Delivery (COD) as well as secure online credit/debit card processing via Stripe interface abstraction.\n\nQ: How can I register my restaurant?\nA: Submit an application through the partner portal. Our culinary verification team reviews food safety licenses and menus within 24-48 business hours.",
                'is_published' => true,
            ]
        );

        Page::firstOrCreate(
            ['slug' => 'terms'],
            [
                'title' => 'Terms of Service',
                'content' => 'By accessing the Fastflow platform, you agree to comply with our fair marketplace policies. Orders are binding once confirmed by partner kitchens. Food preparation standards, ingredient sourcing, and allergen notifications remain the direct operational responsibility of participating restaurants.',
                'is_published' => true,
            ]
        );

        Page::firstOrCreate(
            ['slug' => 'privacy'],
            [
                'title' => 'Privacy Policy',
                'content' => 'Fastflow is committed to customer data security. We collect customer delivery coordinates solely for routing deliveries and verifying service zones. Sensitive payment credentials never touch our core database servers and are tokenized via certified PCI-compliant gateway abstractions.',
                'is_published' => true,
            ]
        );

        Page::firstOrCreate(
            ['slug' => 'refund-policy'],
            [
                'title' => 'Refund & Cancellation Policy',
                'content' => 'Orders may be cancelled free of charge while in "Pending" status prior to kitchen confirmation. If an order arrives damaged or missing key items, customers can request an immediate audit review through customer support. Authorized refunds are processed back to the original payment method.',
                'is_published' => true,
            ]
        );
    }
}
