<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_as_customer(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'secret_password_123',
            'phone' => '+923001234567',
            'role' => 'customer',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'user' => ['id', 'name', 'email', 'role', 'permissions'],
                    'token',
                ],
            ]);

        $this->assertDatabaseHas('users', ['email' => 'john@example.com']);
    }

    public function test_customer_cannot_assign_themselves_an_admin_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Malicious User',
            'email' => 'hacker@example.com',
            'password' => 'secret_password_123',
            'phone' => '+923009999999',
            'role' => 'super_admin', // Attempted privilege escalation
        ]);

        // Validation rule strictly limits registration to customer, restaurant_owner, delivery_rider
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_user_can_login_and_retrieve_profile(): void
    {
        $customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);
        $user = User::factory()->create([
            'email' => 'sarah@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $customerRole->id,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'sarah@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $token = $response->json('data.token');

        $meResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me');

        $meResponse->assertStatus(200)
            ->assertJsonPath('data.email', 'sarah@example.com');
    }
}
