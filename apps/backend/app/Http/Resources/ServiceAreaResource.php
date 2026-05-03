<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ServiceArea;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ServiceArea
 */
final class ServiceAreaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var ServiceArea $a */
        $a = $this->resource;

        return [
            'id' => (string) $a->id,
            'name' => (string) $a->name,
            'city' => (string) $a->city,
            'region' => $a->region !== null ? (string) $a->region : null,
            'country' => (string) $a->country,
            'postcode_prefix' => $a->postcode_prefix !== null ? (string) $a->postcode_prefix : null,
            'centre_latitude' => $a->centre_latitude !== null ? (float) $a->centre_latitude : null,
            'centre_longitude' => $a->centre_longitude !== null ? (float) $a->centre_longitude : null,
            'radius_metres' => $a->radius_metres !== null ? (int) $a->radius_metres : null,
            'active' => (bool) $a->active,
            'created_at' => $a->created_at?->toIso8601String(),
            'updated_at' => $a->updated_at?->toIso8601String(),
        ];
    }
}
