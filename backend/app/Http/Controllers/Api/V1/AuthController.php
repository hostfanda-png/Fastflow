<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use App\Models\Role;
use App\Models\Customer;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $roleName = $request->input('role', 'customer');
        $role = Role::where('name', $roleName)->first() ?? Role::where('name', 'customer')->first();

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role_id' => $role->id,
            'status' => 'active',
        ]);

        if ($roleName === 'customer') {
            Customer::create(['user_id' => $user->id]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        AuditService::log('auth.register', 'Auth', (string)$user->id, "User registered with role {$role->name}", $user);

        return $this->sendResponse([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $role->name,
                'permissions' => $role->permissions->pluck('name')->toArray(),
            ],
            'token' => $token,
        ], 'Registration successful', 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::with(['role.permissions', 'restaurant'])->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return $this->sendError('Invalid email or password', [], 401);
        }

        if ($user->status === 'suspended') {
            return $this->sendError('Account is suspended. Please contact customer support.', [], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        AuditService::log('auth.login', 'Auth', (string)$user->id, "User logged in", $user);

        return $this->sendResponse([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'restaurant_id' => $user->restaurant_id,
                'role' => $user->role->name,
                'permissions' => $user->role->permissions->pluck('name')->toArray(),
            ],
            'token' => $token,
        ], 'Login successful');
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $user->currentAccessToken()?->delete();
            AuditService::log('auth.logout', 'Auth', (string)$user->id, "User logged out", $user);
        }

        return $this->sendResponse(null, 'Logged out successfully');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['role.permissions', 'restaurant', 'addresses']);

        return $this->sendResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'restaurant_id' => $user->restaurant_id,
            'role' => $user->role->name,
            'permissions' => $user->role->permissions->pluck('name')->toArray(),
            'addresses' => $user->addresses,
        ]);
    }
}
