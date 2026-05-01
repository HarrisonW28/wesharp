<?php

declare(strict_types=1);

namespace App\Support\Portal;

use App\Models\CustomerPortalUpdate;

final class PortalCustomerUpdateJson
{
    /** @return array<string, mixed> */
    public static function adminRow(CustomerPortalUpdate $u): array
    {
        $u->loadMissing('createdBy:id,name');

        return [
            'id' => (string) $u->id,
            'body' => $u->body,
            'visibility' => $u->visibility?->value,
            'archived_at' => $u->archived_at?->toIso8601String(),
            'created_at' => $u->created_at?->toIso8601String(),
            'created_by' => $u->createdBy !== null
                ? ['id' => (string) $u->createdBy->getKey(), 'name' => $u->createdBy->name]
                : null,
        ];
    }

    /** Customer-safe — no ids, no internal metadata. */
    /** @return array<string, mixed> */
    public static function portalRow(CustomerPortalUpdate $u): array
    {
        $at = $u->created_at;

        return [
            'body' => $u->body,
            'posted_at' => $at?->toIso8601String(),
            'posted_at_label' => $at !== null
                ? $at->timezone(config('app.timezone'))->format('D j M Y, H:i')
                : null,
        ];
    }
}
