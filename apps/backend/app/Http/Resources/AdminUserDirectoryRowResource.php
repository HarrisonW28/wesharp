<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
final class AdminUserDirectoryRowResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var User $u */
        $u = $this->resource;
        $role = $u->resolvedRole();

        return [
            'id' => (string) $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $role->value,
            'role_bucket' => $role->isInternal() ? 'internal' : 'customer',
            'status' => $u->status?->value,
            'company_id' => $u->company_id !== null ? (string) $u->company_id : null,
            'company_name' => $u->company?->name,
            'created_at' => $u->created_at?->toIso8601String(),
            'updated_at' => $u->updated_at?->toIso8601String(),
        ];
    }
}
