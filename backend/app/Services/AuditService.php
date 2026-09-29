<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;

class AuditService
{
    public static function log(string $action, string $module, ?string $recordId = null, ?string $details = null, ?User $user = null): void
    {
        $request = request();
        $currentUser = $user ?? auth('sanctum')->user() ?? auth()->user();

        AuditLog::create([
            'user_id' => $currentUser?->id,
            'user_name' => $currentUser?->name ?? 'System',
            'role' => $currentUser?->role?->name ?? 'guest',
            'action' => $action,
            'module' => $module,
            'record_id' => $recordId,
            'ip_address' => $request?->ip() ?? '127.0.0.1',
            'details' => $details,
            'created_at' => now(),
        ]);
    }
}
