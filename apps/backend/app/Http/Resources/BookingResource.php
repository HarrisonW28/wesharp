<?php

namespace App\Http\Resources;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Booking
 */
final class BookingResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var Booking $b */
        $b = $this->resource;

        return [
            'id' => (string) $b->id,
            'company_id' => (string) $b->company_id,
            'location_id' => (string) $b->company_location_id,
            'contact_id' => $b->contact_id ? (string) $b->contact_id : null,
            'assigned_route_id' => $b->assigned_route_id ? (string) $b->assigned_route_id : null,
            'status' => $b->booking_status?->value,
            'requested_date' => $b->scheduled_date?->format('Y-m-d'),
            'time_window_start' => $this->formatTimeSlot($b->time_window_start),
            'time_window_end' => $this->formatTimeSlot($b->time_window_end),
            'service_type' => $b->service_type?->value,
            'estimated_knife_count' => $b->estimated_knife_count,
            'actual_knife_count' => $b->actual_knife_count,
            'customer_notes' => $b->customer_notes,
            'internal_notes' => $b->internal_notes,
            'price_estimate' => $b->price_estimate_pence,
            'created_at' => $b->created_at?->toIso8601String(),
            'updated_at' => $b->updated_at?->toIso8601String(),
            'company' => [
                'id' => $b->company_id ? (string) $b->company_id : null,
                'name' => $b->relationLoaded('company') ? $b->company?->name : null,
                'city' => $b->relationLoaded('company') ? $b->company?->city : null,
            ],
            'venue_city' => $b->location?->city ?? $b->company?->city,
        ];
    }

    private function formatTimeSlot(mixed $raw): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        if (is_string($raw)) {
            return strlen($raw) >= 8 ? substr($raw, 0, 8) : $raw;
        }

        /** @phpstan-ignore-next-line */
        if ($raw instanceof \DateTimeInterface) {
            return $raw->format('H:i:s');
        }

        return (string) $raw;
    }
}
