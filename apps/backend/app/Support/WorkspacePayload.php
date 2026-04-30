<?php

namespace App\Support;

use App\Models\ServiceArea;
use App\Models\User;

final class WorkspacePayload
{
    /** @return list<array{type:string, slug:string, label:?string}> */
    public static function for(User $user): array
    {
        $spaces = [];

        $role = $user->resolvedRole();

        if ($role->isInternal()) {
            $spaces[] = [
                'type' => 'staff',
                'slug' => 'ops',
                'label' => 'Internal operations workspace',
            ];
        }

        if ($role->isCustomer()) {
            if ($user->company_id !== null) {
                $spaces[] = [
                    'type' => 'tenant_company',
                    'slug' => (string) $user->company_id,
                    'label' => 'Venue workspace',
                ];
            }
        }

        return array_values(array_filter($spaces));
    }

    /** @return list<array{id:string, name:string, city:?string}> */
    public static function serviceAreas(): array
    {
        return ServiceArea::query()
            ->where('active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'city'])
            ->map(static fn (ServiceArea $a): array => [
                'id' => (string) $a->id,
                'name' => (string) $a->name,
                'city' => $a->city,
            ])
            ->all();
    }
}
