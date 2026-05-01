<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;

/**
 * Centralises audit payloads for polymorphic UUID domain rows while keeping payloads production-safe (no dumps).
 */
final class AuditRecorder
{
    /** @param  array<string, mixed>|null  $payload */
    public static function record(
        ?Authenticatable $actor,
        Model $auditable,
        string $action,
        ?array $payload = null,
        ?Request $request = null,
    ): void {
        $requestId = Context::get('request_id');

        AuditLog::query()->create([
            'actor_id' => $actor instanceof User ? $actor->getKey() : null,
            'subject_user_id' => null,
            'action' => $action,
            'auditable_type' => $auditable::class,
            'auditable_id' => $auditable->getKey(),
            'payload' => $payload ?? [],
            'ip_address' => $request?->ip(),
            'request_id' => is_string($requestId) && $requestId !== '' ? $requestId : null,
            'created_at' => now(),
        ]);
    }
}
