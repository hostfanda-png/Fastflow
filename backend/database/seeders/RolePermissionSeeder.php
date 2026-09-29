<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            'super_admin' => 'Super Administrator',
            'restaurant_owner' => 'Restaurant Owner',
            'restaurant_staff' => 'Restaurant Staff',
            'delivery_rider' => 'Delivery Rider',
            'customer' => 'Customer',
            'support_agent' => 'Support Agent',
        ];

        $roleModels = [];
        foreach ($roles as $name => $displayName) {
            $roleModels[$name] = Role::firstOrCreate(
                ['name' => $name],
                ['display_name' => $displayName]
            );
        }

        $permissions = [
            // Admin
            ['name' => 'admin.view', 'display_name' => 'View Admin Console', 'module' => 'admin'],
            ['name' => 'admin.manage', 'display_name' => 'Manage Platform Settings', 'module' => 'admin'],
            
            // Restaurant
            ['name' => 'restaurant.view', 'display_name' => 'View Restaurants', 'module' => 'restaurant'],
            ['name' => 'restaurant.create', 'display_name' => 'Create Restaurant', 'module' => 'restaurant'],
            ['name' => 'restaurant.update', 'display_name' => 'Update Restaurant', 'module' => 'restaurant'],
            ['name' => 'restaurant.delete', 'display_name' => 'Delete Restaurant', 'module' => 'restaurant'],
            ['name' => 'restaurant.approve', 'display_name' => 'Approve Restaurant', 'module' => 'restaurant'],
            
            // Menu
            ['name' => 'menu.view', 'display_name' => 'View Menu', 'module' => 'menu'],
            ['name' => 'menu.create', 'display_name' => 'Create Menu Items', 'module' => 'menu'],
            ['name' => 'menu.update', 'display_name' => 'Update Menu Items', 'module' => 'menu'],
            ['name' => 'menu.delete', 'display_name' => 'Delete Menu Items', 'module' => 'menu'],
            
            // Orders
            ['name' => 'order.view', 'display_name' => 'View Orders', 'module' => 'order'],
            ['name' => 'order.create', 'display_name' => 'Create Orders', 'module' => 'order'],
            ['name' => 'order.update', 'display_name' => 'Update Order Status', 'module' => 'order'],
            ['name' => 'order.cancel', 'display_name' => 'Cancel Order', 'module' => 'order'],
            
            // Riders
            ['name' => 'rider.view', 'display_name' => 'View Riders', 'module' => 'rider'],
            ['name' => 'rider.assign', 'display_name' => 'Assign Rider to Order', 'module' => 'rider'],
            ['name' => 'rider.manage', 'display_name' => 'Manage Courier Fleet', 'module' => 'rider'],

            // Financials & Coupons
            ['name' => 'coupon.manage', 'display_name' => 'Manage Coupons', 'module' => 'coupon'],
            ['name' => 'payment.manage', 'display_name' => 'Manage Payments', 'module' => 'payment'],
            ['name' => 'report.view', 'display_name' => 'View Financial Reports', 'module' => 'reports'],
            ['name' => 'settings.manage', 'display_name' => 'Manage Settings', 'module' => 'settings'],
        ];

        $permissionModels = [];
        foreach ($permissions as $p) {
            $permissionModels[$p['name']] = Permission::firstOrCreate(
                ['name' => $p['name']],
                ['display_name' => $p['display_name'], 'module' => $p['module']]
            );
        }

        // Assign to Super Admin (all permissions)
        $roleModels['super_admin']->permissions()->sync(collect($permissionModels)->pluck('id'));

        // Assign to Restaurant Owner
        $ownerPerms = ['restaurant.view', 'restaurant.update', 'menu.view', 'menu.create', 'menu.update', 'menu.delete', 'order.view', 'order.update', 'report.view'];
        $roleModels['restaurant_owner']->permissions()->sync(
            collect($permissionModels)->filter(fn($p, $k) => in_array($k, $ownerPerms))->pluck('id')
        );

        // Assign to Restaurant Staff
        $staffPerms = ['menu.view', 'order.view', 'order.update'];
        $roleModels['restaurant_staff']->permissions()->sync(
            collect($permissionModels)->filter(fn($p, $k) => in_array($k, $staffPerms))->pluck('id')
        );

        // Assign to Rider
        $riderPerms = ['rider.view', 'order.view', 'order.update'];
        $roleModels['delivery_rider']->permissions()->sync(
            collect($permissionModels)->filter(fn($p, $k) => in_array($k, $riderPerms))->pluck('id')
        );

        // Assign to Customer
        $customerPerms = ['order.view', 'order.create', 'order.cancel'];
        $roleModels['customer']->permissions()->sync(
            collect($permissionModels)->filter(fn($p, $k) => in_array($k, $customerPerms))->pluck('id')
        );
    }
}
