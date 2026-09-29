<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        if (!$user->role || (!in_array($user->role->name, $roles) && $user->role->name !== 'super_admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: You do not have the required role to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}
