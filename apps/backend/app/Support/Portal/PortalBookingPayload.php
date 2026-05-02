<?php

namespace App\Support\Portal;

use App\Enums\BookingStatus;
use App\Enums\EvidencePhotoVisibility;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\CustomerPortalUpdate;
use App\Policies\BookingPolicy;
use App\Support\Portal\CustomerActivityTimelinePresenter;
use Illuminate\Http\Request;

final class PortalBookingPayload
{
    /**
     * Mirrors {@see BookingPolicy::cancel()} for tenant customers — single source for the portal UI.
     */
    public static function customerCanCancel(Booking $booking): bool
    {
        if ($booking->assigned_route_id !== null) {
            return false;
        }

        if ($booking->orders()->exists()) {
            return false;
        }

        return in_array($booking->booking_status, [BookingStatus::Requested, BookingStatus::Confirmed], true);
    }

    /**
     * @return array<string, mixed>
     */
    public static function list(Request $request, Booking $booking): array
    {
        $row = (new BookingResource($booking))->toArray($request);

        unset(
            $row['internal_notes'],
            $row['price_estimate'],
            $row['price_estimate_minor'],
            $row['formatted_amount'],
            $row['currency'],
        );

        $row['customer_cancellable'] = self::customerCanCancel($booking);

        $row['display_collection_date'] = ($booking->confirmed_collection_date ?? $booking->requested_collection_date ?? $booking->scheduled_date)?->format('Y-m-d');
        $row['display_time_window_start'] = $booking->confirmed_time_window_start
            ?? $booking->requested_time_window_start
            ?? $booking->time_window_start;
        $row['display_time_window_end'] = $booking->confirmed_time_window_end
            ?? $booking->requested_time_window_end
            ?? $booking->time_window_end;

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
            'routeStop',
            'assignedRoute:id,route_status,scheduled_date',
            'orders' => fn ($q) => $q->select('id', 'company_id', 'booking_id', 'order_status', 'total_pence', 'currency', 'knife_count')->limit(50),
        ]);

        $compact = PortalBookingPayload::list($request, $booking);

        $fulfilment = PortalFulfilmentPresenter::forBooking($booking);

        $customerMessages = [];
        if (config('wesharp_evidence.show_in_customer_portal', true)) {
            $customerMessages = CustomerPortalUpdate::query()
                ->where('booking_id', $booking->id)
                ->where('company_id', $booking->company_id)
                ->active()
                ->where('visibility', EvidencePhotoVisibility::CustomerVisible->value)
                ->orderBy('created_at')
                ->get()
                ->map(static fn (CustomerPortalUpdate $u): array => PortalCustomerUpdateJson::portalRow($u))
                ->values()
                ->all();
        }

        return array_merge($compact, [
            'activity_timeline' => CustomerActivityTimelinePresenter::forBooking($booking),
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
            'orders' => $booking->relationLoaded('orders') ? $booking->orders->map(static fn ($o): array => [
                'id' => (string) $o->id,
                'status' => $o->order_status?->value,
                'knife_count' => $o->knife_count,
                'total_pence' => (int) $o->total_pence,
                'currency' => $o->currency,
            ]) : [],
            'fulfilment' => $fulfilment,
            'customer_messages' => $customerMessages,
        ]);
    }

    /**
     * Guest-safe booking detail for the public tracking API (no entity UUIDs).
     *
     * @return array<string, mixed>
     */
    public static function publicTracking(Request $request, Booking $booking): array
    {
        $data = self::detail($request, $booking);

        foreach (['id', 'company_id', 'location_id', 'contact_id', 'assigned_route_id'] as $key) {
            unset($data[$key]);
        }

        unset($data['assigned_route']);

        if (isset($data['company']) && is_array($data['company'])) {
            unset($data['company']['id']);
        }

        if (isset($data['location']) && is_array($data['location'])) {
            unset($data['location']['id']);
        }

        if (isset($data['contact']) && is_array($data['contact'])) {
            unset($data['contact']['id']);
        }

        if (isset($data['orders']) && is_array($data['orders'])) {
            $data['orders'] = array_values(array_map(static function (array $row): array {
                unset($row['id']);

                return $row;
            }, $data['orders']));
        }

        $data['customer_cancellable'] = false;
        unset($data['activity_timeline']);

        return $data;
    }
}
