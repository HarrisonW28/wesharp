<?php

namespace App\Support\Portal;

use App\Http\Resources\BookingResource;
use App\Models\Booking;
use Illuminate\Http\Request;

final class PortalBookingPayload
{
    /**
     * @return array<string, mixed>
     */
    public static function list(Request $request, Booking $booking): array
    {
        $row = (new BookingResource($booking))->toArray($request);

        unset($row['internal_notes'], $row['price_estimate']);

        return $row;
    }

    /**
     * Tenant-safe booking narrative — hides internal estimating + audit payloads.
     *
     * @return array<string, mixed>
     */
    public static function detail(Request $request, Booking $booking): array
    {
        $booking->loadMissing([
            'company:id,name,city,phone,billing_email',
            'location',
            'contact',
            'assignedRoute:id,name,route_status,scheduled_date',
            'routeStop:id,sequence,route_stop_status',
            'orders' => fn ($q) => $q->select('id', 'company_id', 'booking_id', 'order_status', 'total_pence', 'currency', 'knife_count')->limit(50),
        ]);

        $compact = PortalBookingPayload::list($request, $booking);

        return array_merge($compact, [
            'company' => $booking->company ? [
                'id' => (string) $booking->company->id,
                'name' => $booking->company->name,
                'city' => $booking->company->city,
                'phone' => $booking->company->phone,
                'billing_email' => $booking->company->billing_email,
            ] : null,
            'location' => $booking->location ? [
                'id' => (string) $booking->location->id,
                'label' => $booking->location->label,
                'line_one' => $booking->location->line_one,
                'line_two' => $booking->location->line_two,
                'city' => $booking->location->city,
                'postcode' => $booking->location->postcode,
                'country' => $booking->location->country,
            ] : null,
            'contact' => $booking->contact ? [
                'id' => (string) $booking->contact->id,
                'first_name' => $booking->contact->first_name,
                'last_name' => $booking->contact->last_name,
                'email' => $booking->contact->email,
                'phone' => $booking->contact->phone,
            ] : null,
            'assigned_route' => $booking->assignedRoute !== null ? [
                'id' => (string) $booking->assignedRoute->id,
                'name' => $booking->assignedRoute->name,
                'route_status' => $booking->assignedRoute->route_status?->value,
                'scheduled_date' => $booking->assignedRoute->scheduled_date?->format('Y-m-d'),
            ] : null,
            'route_stop' => $booking->routeStop ? [
                'id' => (string) $booking->routeStop->id,
                'sequence' => $booking->routeStop->sequence,
                'route_stop_status' => $booking->routeStop->route_stop_status?->value,
            ] : null,
            'orders' => $booking->relationLoaded('orders') ? $booking->orders->map(static fn ($o): array => [
                'id' => (string) $o->id,
                'status' => $o->order_status?->value,
                'knife_count' => $o->knife_count,
                'total_pence' => (int) $o->total_pence,
                'currency' => $o->currency,
            ]) : [],
        ]);
    }
}
