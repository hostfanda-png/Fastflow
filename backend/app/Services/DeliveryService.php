<?php

namespace App\Services;

use App\Models\Restaurant;
use App\Models\CustomerAddress;

class DeliveryService
{
    /**
     * Authoritative backend determination of delivery availability and fees.
     */
    public static function checkDeliveryEligibility(Restaurant $restaurant, ?CustomerAddress $address, ?float $subtotal = null): array
    {
        // 1. Restaurant status and delivery toggle check
        if ($restaurant->status !== 'approved' || $restaurant->is_active === false) {
            return [
                'can_deliver' => false,
                'reason' => "Restaurant '{$restaurant->name}' is currently unavailable or inactive.",
                'delivery_fee' => (float)$restaurant->delivery_fee,
                'minimum_order' => (float)$restaurant->minimum_order,
            ];
        }

        if ($restaurant->delivery_enabled === false) {
            return [
                'can_deliver' => false,
                'reason' => "Delivery is currently disabled for restaurant '{$restaurant->name}'.",
                'delivery_fee' => (float)$restaurant->delivery_fee,
                'minimum_order' => (float)$restaurant->minimum_order,
            ];
        }

        if (!$restaurant->isOpen()) {
            return [
                'can_deliver' => false,
                'reason' => "Restaurant '{$restaurant->name}' is currently closed.",
                'delivery_fee' => (float)$restaurant->delivery_fee,
                'minimum_order' => (float)$restaurant->minimum_order,
            ];
        }

        $deliveryFee = (float)$restaurant->delivery_fee;
        $minOrder = (float)$restaurant->minimum_order;
        $distanceKm = null;

        // 2. Geographical check if address and coordinates available
        if ($address) {
            if ($restaurant->lat && $restaurant->lng && $address->lat && $address->lng) {
                $earthRadius = 6371; // Earth's radius in kilometers
                $dLat = deg2rad($address->lat - $restaurant->lat);
                $dLng = deg2rad($address->lng - $restaurant->lng);
                $a = sin($dLat / 2) * sin($dLat / 2) +
                     cos(deg2rad($restaurant->lat)) * cos(deg2rad($address->lat)) *
                     sin($dLng / 2) * sin($dLng / 2);
                $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
                $distanceKm = round($earthRadius * $c, 2);

                $maxRadius = (float)($restaurant->service_radius_km ?: env('DEFAULT_DELIVERY_RADIUS_KM', 15.0));
                if ($distanceKm > $maxRadius) {
                    return [
                        'can_deliver' => false,
                        'reason' => "The selected address is {$distanceKm} km away, which exceeds this restaurant's maximum delivery radius of {$maxRadius} km.",
                        'distance_km' => $distanceKm,
                        'max_radius_km' => $maxRadius,
                        'delivery_fee' => $deliveryFee,
                        'minimum_order' => $minOrder,
                    ];
                }
            }

            // 3. Check delivery zones if restaurant has specific active delivery zones
            $activeZones = $restaurant->deliveryZones()->where('is_active', true)->get();
            if ($activeZones->isNotEmpty()) {
                $matchedZone = null;
                $addressArea = strtolower(trim($address->area ?? ''));
                $addressCity = strtolower(trim($address->city ?? ''));

                foreach ($activeZones as $zone) {
                    $zoneName = strtolower(trim($zone->zone_name));
                    if ($zoneName === $addressArea || $zoneName === $addressCity || str_contains($addressArea, $zoneName)) {
                        $matchedZone = $zone;
                        break;
                    }
                }

                if ($matchedZone) {
                    $deliveryFee = (float)$matchedZone->delivery_fee;
                    if ($matchedZone->min_order > 0) {
                        $minOrder = (float)$matchedZone->min_order;
                    }
                }
            }
        }

        // 4. Subtotal threshold check
        if ($subtotal !== null && $subtotal < $minOrder) {
            return [
                'can_deliver' => false,
                'reason' => "Order subtotal of {$subtotal} is below restaurant minimum order threshold of {$minOrder}.",
                'distance_km' => $distanceKm,
                'delivery_fee' => $deliveryFee,
                'minimum_order' => $minOrder,
            ];
        }

        return [
            'can_deliver' => true,
            'reason' => null,
            'distance_km' => $distanceKm,
            'delivery_fee' => $deliveryFee,
            'minimum_order' => $minOrder,
            'estimated_delivery_time' => $restaurant->estimated_delivery_time ?? '25-35 min',
        ];
    }
}
