<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Support\Money\MoneyFormatting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Booking
 */
final class BookingDetailResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var Booking $b */
        $b = $this->resource;

        $timeline = AuditLog::query()
            ->with('actor:id,name')
            ->where('auditable_type', Booking::class)
            ->where('auditable_id', $b->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(static fn (AuditLog $row) => [
                'id' => (string) $row->id,
                'at' => $row->created_at?->toIso8601String(),
                'action' => $row->action,
                'actor_name' => $row->actor?->name,
                'payload' => $row->payload,
            ]);

        return [
            'id' => (string) $b->id,
            'reference' => BookingResource::reference($b),
            'company_id' => (string) $b->company_id,
            'location_id' => (string) $b->company_location_id,
            'contact_id' => $b->contact_id ? (string) $b->contact_id : null,
            'assigned_route_id' => $b->assigned_route_id ? (string) $b->assigned_route_id : null,
            'status' => $b->booking_status?->value,
            'cancellation_reason' => $b->cancellation_reason,
            'requested_date' => ($b->requested_collection_date ?? $b->scheduled_date)?->format('Y-m-d'),
            'time_window_start' => BookingResource::formatTimeSlot($b->requested_time_window_start ?? $b->time_window_start),
            'time_window_end' => BookingResource::formatTimeSlot($b->requested_time_window_end ?? $b->time_window_end),
            'requested_collection_date' => $b->requested_collection_date?->format('Y-m-d'),
            'requested_time_window_start' => BookingResource::formatTimeSlot($b->requested_time_window_start),
            'requested_time_window_end' => BookingResource::formatTimeSlot($b->requested_time_window_end),
            'confirmed_collection_date' => $b->confirmed_collection_date?->format('Y-m-d'),
            'confirmed_time_window_start' => BookingResource::formatTimeSlot($b->confirmed_time_window_start),
            'confirmed_time_window_end' => BookingResource::formatTimeSlot($b->confirmed_time_window_end),
            'service_type' => $b->service_type?->value,
            'estimated_knife_count' => $b->estimated_knife_count,
            'actual_knife_count' => $b->actual_knife_count,
            'customer_notes' => $b->customer_notes,
            'internal_notes' => $b->internal_notes,
            'price_estimate' => $b->price_estimate_pence,
            'price_estimate_minor' => $b->price_estimate_pence,
            'currency' => 'GBP',
            'formatted_amount' => $b->price_estimate_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $b->price_estimate_pence)
                : null,
            'created_at' => $b->created_at?->toIso8601String(),
            'updated_at' => $b->updated_at?->toIso8601String(),
            'company' => $b->company ? [
                'id' => (string) $b->company->id,
                'name' => $b->company->name,
                'slug' => $b->company->slug,
                'city' => $b->company->city,
                'phone' => $b->company->phone,
                'billing_email' => $b->company->billing_email,
            ] : null,
            'location' => $b->location ? [
                'id' => (string) $b->location->id,
                'label' => $b->location->label,
                'line_one' => $b->location->line_one,
                'line_two' => $b->location->line_two,
                'city' => $b->location->city,
                'postcode' => $b->location->postcode,
                'country' => $b->location->country,
            ] : null,
            'contact' => $b->contact ? [
                'id' => (string) $b->contact->id,
                'first_name' => $b->contact->first_name,
                'last_name' => $b->contact->last_name,
                'email' => $b->contact->email,
                'phone' => $b->contact->phone,
            ] : null,
            'assigned_route' => $b->assignedRoute ? [
                'id' => (string) $b->assignedRoute->id,
                'name' => $b->assignedRoute->name,
                'route_status' => $b->assignedRoute->route_status?->value,
                'scheduled_date' => $b->assignedRoute->scheduled_date?->format('Y-m-d'),
            ] : null,
            'route_stop' => $b->routeStop ? [
                'id' => (string) $b->routeStop->id,
                'sequence' => $b->routeStop->sequence,
                'route_stop_status' => $b->routeStop->route_stop_status?->value,
            ] : null,
            'orders' => $b->orders->map(static fn ($o) => [
                'id' => (string) $o->id,
                'order_status' => $o->order_status?->value,
                'total_pence' => (int) $o->total_pence,
                'currency' => $o->currency,
            ]),
            'status_timeline' => $timeline,
        ];
    }
}
