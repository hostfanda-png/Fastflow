<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CustomerAddress;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class CustomerController extends Controller
{
    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user()->load(['role.permissions', 'addresses']);

        return $this->sendResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'role' => $user->role->name,
            'addresses' => $user->addresses,
        ], 'Customer profile retrieved');
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:30'],
            'avatar' => ['nullable', 'string', 'max:500'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        AuditService::log('customer.update_profile', 'Customer', (string)$user->id, 'Updated profile information', $user);

        return $this->sendResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'role' => $user->role->name,
        ], 'Profile updated successfully');
    }

    public function getAddresses(Request $request): JsonResponse
    {
        $user = $request->user();
        $addresses = CustomerAddress::where('user_id', $user->id)->orderByDesc('is_default')->get();

        return $this->sendResponse($addresses, 'Customer addresses retrieved');
    }

    public function storeAddress(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:50'],
            'street' => ['required', 'string', 'max:255'],
            'area' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'delivery_instructions' => ['nullable', 'string', 'max:500'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        if (!empty($validated['is_default'])) {
            CustomerAddress::where('user_id', $user->id)->update(['is_default' => false]);
        }

        $validated['user_id'] = $user->id;
        $address = CustomerAddress::create($validated);

        AuditService::log('customer.add_address', 'Customer', (string)$address->id, "Added address {$address->label}", $user);

        return $this->sendResponse($address, 'Delivery address added successfully', 201);
    }

    public function updateAddress(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $address = CustomerAddress::where('user_id', $user->id)->findOrFail($id);

        $validated = $request->validate([
            'label' => ['sometimes', 'string', 'max:50'],
            'street' => ['sometimes', 'string', 'max:255'],
            'area' => ['sometimes', 'string', 'max:100'],
            'city' => ['sometimes', 'string', 'max:100'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'delivery_instructions' => ['nullable', 'string', 'max:500'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        if (!empty($validated['is_default'])) {
            CustomerAddress::where('user_id', $user->id)->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $address->update($validated);

        return $this->sendResponse($address, 'Address updated successfully');
    }

    public function deleteAddress(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $address = CustomerAddress::where('user_id', $user->id)->findOrFail($id);
        $address->delete();

        AuditService::log('customer.delete_address', 'Customer', (string)$id, 'Deleted delivery address', $user);

        return $this->sendResponse(null, 'Address removed successfully');
    }
}
