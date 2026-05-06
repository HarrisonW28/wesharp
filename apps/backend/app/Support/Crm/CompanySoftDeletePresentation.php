<?php

declare(strict_types=1);

namespace App\Support\Crm;

use App\Models\Company;

final class CompanySoftDeletePresentation
{
    /**
     * @return array{id: string, name: string, city: string|null, is_deleted: bool, deleted_at: string|null}|null
     */
    public static function embed(?Company $company): ?array
    {
        if ($company === null) {
            return null;
        }

        return [
            'id' => (string) $company->id,
            'name' => $company->name,
            'city' => $company->city,
            'is_deleted' => $company->trashed(),
            'deleted_at' => $company->deleted_at?->toIso8601String(),
        ];
    }
}
