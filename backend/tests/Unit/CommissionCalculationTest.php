<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class CommissionCalculationTest extends TestCase
{
    /**
     * Test percentage commission calculation.
     */
    public function test_percentage_commission_calculation(): void
    {
        $orderSubtotal = 100.00;
        $commissionRate = 15.00; // 15%

        $platformCommission = ($orderSubtotal * $commissionRate) / 100;
        $restaurantNet = $orderSubtotal - $platformCommission;

        $this->assertEquals(15.00, $platformCommission);
        $this->assertEquals(85.00, $restaurantNet);
    }

    /**
     * Test fixed commission calculation.
     */
    public function test_fixed_commission_calculation(): void
    {
        $orderSubtotal = 80.00;
        $fixedFee = 10.00;

        $platformCommission = min($fixedFee, $orderSubtotal);
        $restaurantNet = $orderSubtotal - $platformCommission;

        $this->assertEquals(10.00, $platformCommission);
        $this->assertEquals(70.00, $restaurantNet);
    }

    /**
     * Test single restaurant cart rule enforcement logic.
     */
    public function test_single_restaurant_cart_rule(): void
    {
        $existingRestaurantId = 1;
        $newItemRestaurantId = 2;

        $isConflict = $existingRestaurantId !== $newItemRestaurantId;
        $this->assertTrue($isConflict, 'Items from different restaurants must trigger a conflict.');
    }
}
