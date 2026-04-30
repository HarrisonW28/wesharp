<?php

namespace App\Http\Resources;

use App\Models\CompanyLocation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CompanyLocation */
class CrmLocationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var CompanyLocation $loc */
        $loc = $this->resource;
        $archived = $loc->archived_at !== null;

        return [
            'id' => (string) $loc->id,
            'label' => $loc->label,
            'is_default' => (bool) $loc->is_default,
            'line_one' => $loc->line_one,
            'line_two' => $loc->line_two,
            'city' => $loc->city,
            'postcode' => $loc->postcode,
            'country' => $loc->country,
            'latitude' => $loc->latitude,
            'longitude' => $loc->longitude,
            'notes' => $loc->notes,
            'archived_at' => $loc->archived_at?->toIso8601String(),
            'is_archived' => $archived,
            'status_label' => $archived ? 'Archived' : 'Active',
        ];
    }

    public static function summaryLine(CompanyLocation $loc): string
    {
        $parts = array_filter([
            $loc->line_one,
            $loc->line_two,
            $loc->city,
            $loc->postcode,
        ], static fn ($v) => $v !== null && $v !== '');

        return $parts !== [] ? implode(', ', $parts) : (string) ($loc->label ?? '');
    }
}
