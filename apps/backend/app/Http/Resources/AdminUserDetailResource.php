<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\Audit\AuditLogPresenter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
final class AdminUserDetailResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var User $u */
        $u = $this->resource;
        $u->loadMissing('company:id,name,city');
        $role = $u->resolvedRole();

        return [
            'id' => (string) $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $role->value,
            'role_bucket' => $role->isInternal() ? 'internal' : 'customer',
            'status' => $u->status?->value,
            'company_id' => $u->company_id !== null ? (string) $u->company_id : null,
            'company' => $u->company !== null ? [
                'id' => (string) $u->company->id,
                'name' => $u->company->name,
                'city' => $u->company->city,
            ] : null,
            'created_at' => $u->created_at?->toIso8601String(),
            'updated_at' => $u->updated_at?->toIso8601String(),
            'admin_metadata' => [
                'clerk_user_id' => $u->clerk_user_id,
            ],
            'recent_activity' => self::recentAuditPayload($u),
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function recentAuditPayload(User $u): array
    {
        $rows = AuditLog::query()
            ->with('actor:id,name,email')
            ->where('auditable_type', User::class)
            ->where('auditable_id', (string) $u->getKey())
            ->orderByDesc('created_at')
            ->limit(40)
            ->get();

        return AuditLogPresenter::mapTimeline($rows, includeIp: false);
    }
}
