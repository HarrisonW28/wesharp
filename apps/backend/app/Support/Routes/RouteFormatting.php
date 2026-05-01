<?php

namespace App\Support\Routes;

use App\Enums\RouteStopStatus;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use Illuminate\Support\Str;
use App\Models\OperationalRoute;
use App\Models\RouteStop;

final class RouteFormatting
{
    /** @return array<string, mixed> */
    public static function listRow(OperationalRoute $r): array
    {
        $total = isset($r->stops_count) ? (int) $r->stops_count : $r->stops()->count();
        $completed = isset($r->completed_stops_count)
            ? (int) $r->completed_stops_count
            : $r->stops()->where('route_stop_status', RouteStopStatus::Completed)->count();

        return [
            'id' => (string) $r->id,
            'name' => $r->name,
            'route_status' => $r->route_status?->value,
            'route_status_label' => $r->route_status !== null
                ? Str::headline(str_replace('_', ' ', $r->route_status->value))
                : null,
            'scheduled_date' => $r->scheduled_date?->format('Y-m-d'),
            'coverage_city' => $r->coverage_city,
            'driver_user_id' => $r->driver_user_id !== null ? (string) $r->driver_user_id : null,
            'driver_name' => $r->relationLoaded('driver') ? $r->driver?->name : null,
            'stops_count' => $total,
            'completed_stops' => $completed,
            'incomplete_stops' => max(0, $total - $completed),
        ];
    }

    /** @param  iterable<int, OperationalRoute>  $routes */
    public static function todayMetrics(iterable $routes): array
    {
        $stopsCompleted = 0;
        $stopsTotal = 0;
        $knivesEstimate = 0;
        $revenueEstimatePence = 0;

        foreach ($routes as $route) {
            foreach ($route->stops ?? [] as $stop) {
                /** @var RouteStop $stop */
                $stopsTotal++;

                if ($stop->route_stop_status === RouteStopStatus::Completed) {
                    $stopsCompleted++;
                }

                $booking = $stop->booking;

                if ($booking instanceof Booking) {
                    $knivesEstimate += (int) ($booking->estimated_knife_count ?? 0);

                    $orderTotal = 0;

                    foreach ($booking->orders ?? [] as $order) {
                        $orderTotal += (int) $order->total_pence;
                    }

                    if ($orderTotal > 0) {
                        $revenueEstimatePence += $orderTotal;
                    } else {
                        $revenueEstimatePence += (int) ($booking->price_estimate_pence ?? 0);
                    }
                }
            }
        }

        return [
            'total_stops' => $stopsTotal,
            'completed_stops' => $stopsCompleted,
            'estimated_knives' => $knivesEstimate,
            'estimated_revenue_pence' => $revenueEstimatePence,
        ];
    }

    /** @return array<string, mixed> */
    public static function routeDetail(OperationalRoute $route): array
    {
        $route->loadMissing([
            'driver:id,name',
            'stops.booking.company:id,name,city,phone',
            'stops.booking.location',
            'stops.booking.orders:id,booking_id,total_pence,currency',
        ]);

        return [
            'id' => (string) $route->id,
            'name' => $route->name,
            'route_status' => $route->route_status?->value,
            'scheduled_date' => $route->scheduled_date?->format('Y-m-d'),
            'coverage_city' => $route->coverage_city,
            'notes' => $route->notes,
            'meta' => $route->meta,
            'assigned_staff' => $route->driver ? [
                'id' => (string) $route->driver->id,
                'name' => $route->driver->name,
            ] : null,
            'stops' => $route->stops->map(fn (RouteStop $s) => self::stopSummary($s))->values()->all(),
            'progress' => self::routeProgress($route),
        ];
    }

    /**
     * @phpstan-return array{completed: int, total: int}
     */
    private static function routeProgress(OperationalRoute $route): array
    {
        $total = $route->stops->count();

        $completed = $route->stops->where(
            'route_stop_status',
            RouteStopStatus::Completed
        )->count();

        return [
            'completed' => $completed,
            'total' => $total,
            'pending' => max(0, $total - $completed),
        ];
    }

    /** @return array<string, mixed> */
    public static function stopSummary(RouteStop $stop): array
    {
        $booking = $stop->booking;

        return [
            'id' => (string) $stop->id,
            'sequence' => $stop->sequence,
            'route_stop_status' => $stop->route_stop_status?->value,
            'route_stop_status_label' => $stop->route_stop_status !== null
                ? Str::headline(str_replace('_', ' ', $stop->route_stop_status->value))
                : null,
            'booking_id' => $booking !== null ? (string) $booking->id : null,
            'booking_reference' => $booking !== null ? BookingResource::reference($booking) : null,
            'planned_window' => self::plannedWindowLine($booking),
            'expected_arrival_at' => $stop->expected_arrival_at?->toIso8601String(),
            'arrived_at' => $stop->arrived_at?->toIso8601String(),
            'departed_at' => $stop->departed_at?->toIso8601String(),
            'actual_knife_count' => $stop->actual_knife_count,
            'damage_notes' => $stop->damage_notes,
            'company_name' => $booking?->company?->name,
            'booking_status' => $booking?->booking_status?->value,
            'service_type' => $booking?->service_type?->value,
            'estimated_knife_count' => $booking?->estimated_knife_count,
            'customer_notes' => $booking?->customer_notes,
            'confirmed_collection_date' => $booking?->confirmed_collection_date?->format('Y-m-d'),
            'confirmed_time_window_start' => BookingResource::formatTimeSlot($booking?->confirmed_time_window_start),
            'confirmed_time_window_end' => BookingResource::formatTimeSlot($booking?->confirmed_time_window_end),
            'address_line' => collect([
                $booking?->location?->line_one,
                $booking?->location?->line_two,
                $booking?->location?->city,
                $booking?->location?->postcode,
            ])->filter()->values()->implode(', '),
            'postcode' => $booking?->location?->postcode,
        ];
    }

    /** @return array<string, mixed> */
    public static function stopDetail(RouteStop $stop): array
    {
        $stop->loadMissing([
            'route.driver:id,name',
            'booking.company:id,name,city,phone',
            'booking.location',
            'booking.contact',
            'booking.orders:id,booking_id,total_pence,currency',
        ]);

        $booking = $stop->booking;
        $order = $booking?->orders->first();

        return [
            'id' => (string) $stop->id,
            'sequence' => $stop->sequence,
            'route_stop_status' => $stop->route_stop_status?->value,
            'expected_arrival_at' => $stop->expected_arrival_at?->toIso8601String(),
            'arrived_at' => $stop->arrived_at?->toIso8601String(),
            'departed_at' => $stop->departed_at?->toIso8601String(),
            'actual_knife_count' => $stop->actual_knife_count,
            'damage_notes' => $stop->damage_notes,
            'route_id' => (string) $stop->route_id,
            'route' => $stop->route !== null ? [
                'name' => $stop->route->name,
                'notes' => $stop->route->notes,
                'driver' => [
                    'id' => $stop->route->driver_user_id !== null ? (string) $stop->route->driver_user_id : null,
                    'name' => $stop->route->driver?->name,
                ],
            ] : null,
            'booking' => $booking ? [
                'id' => (string) $booking->id,
                'status' => $booking->booking_status?->value,
                'requested_date' => $booking->scheduled_date?->format('Y-m-d'),
                'time_window_start' => BookingResource::formatTimeSlot($booking->requested_time_window_start ?? $booking->time_window_start),
                'time_window_end' => BookingResource::formatTimeSlot($booking->requested_time_window_end ?? $booking->time_window_end),
                'confirmed_collection_date' => $booking->confirmed_collection_date?->format('Y-m-d'),
                'confirmed_time_window_start' => BookingResource::formatTimeSlot($booking->confirmed_time_window_start),
                'confirmed_time_window_end' => BookingResource::formatTimeSlot($booking->confirmed_time_window_end),
                'service_type' => $booking->service_type?->value,
                'estimated_knife_count' => $booking->estimated_knife_count,
                'actual_knife_count' => $booking->actual_knife_count,
                'customer_notes' => $booking->customer_notes,
                'internal_notes' => $booking->internal_notes,
            ] : null,
            'order' => $order !== null ? [
                'id' => (string) $order->id,
                'total_pence' => (int) $order->total_pence,
                'currency' => $order->currency,
            ] : null,
            'company' => $booking?->company ? [
                'id' => (string) $booking->company->id,
                'name' => $booking->company->name,
                'city' => $booking->company->city,
            ] : null,
            'location' => $booking?->location ? [
                'label' => $booking->location->label,
                'line_one' => $booking->location->line_one,
                'line_two' => $booking->location->line_two,
                'city' => $booking->location->city,
                'postcode' => $booking->location->postcode,
            ] : null,
            'contact' => $booking?->contact ? [
                'first_name' => $booking->contact->first_name,
                'last_name' => $booking->contact->last_name,
                'phone' => $booking->contact->phone,
            ] : null,
        ];
    }

    private static function plannedWindowLine(?Booking $booking): ?string
    {
        if ($booking === null) {
            return null;
        }

        $start = BookingResource::formatTimeSlot($booking->requested_time_window_start ?? $booking->time_window_start);
        $end = BookingResource::formatTimeSlot($booking->requested_time_window_end ?? $booking->time_window_end);

        if ($start === null && $end === null) {
            return null;
        }

        $day = $booking->scheduled_date?->format('Y-m-d');
        $win = ($start ?? '?').'–'.($end ?? '?');

        return $day !== null && $day !== '' ? "{$day} · {$win}" : $win;
    }
}
