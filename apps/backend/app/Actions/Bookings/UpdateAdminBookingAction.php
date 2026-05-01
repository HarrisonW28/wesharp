<?php

declare(strict_types=1);

namespace App\Actions\Bookings;

use App\Enums\ServiceType;
use App\Http\Requests\UpdateBookingRequest;
use App\Models\Booking;
use App\Services\Audit\AuditRecorder;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class UpdateAdminBookingAction
{
    /**
     * @param  array<string, mixed>  $validated  From {@see UpdateBookingRequest}
     */
    public function execute(
        Booking $booking,
        ?Authenticatable $actor,
        array $validated,
        ?Request $request = null,
    ): Booking {
        $capture = [
            'scheduled_date' => $booking->scheduled_date,
            'requested_collection_date' => $booking->requested_collection_date,
            'requested_time_window_start' => $booking->requested_time_window_start,
            'requested_time_window_end' => $booking->requested_time_window_end,
            'confirmed_collection_date' => $booking->confirmed_collection_date,
            'confirmed_time_window_start' => $booking->confirmed_time_window_start,
            'confirmed_time_window_end' => $booking->confirmed_time_window_end,
            'contact_id' => $booking->contact_id,
            'time_window_start' => $booking->time_window_start,
            'time_window_end' => $booking->time_window_end,
            'service_type' => $booking->service_type?->value,
            'estimated_knife_count' => $booking->estimated_knife_count,
            'actual_knife_count' => $booking->actual_knife_count,
            'customer_notes' => $booking->customer_notes,
            'internal_notes' => $booking->internal_notes,
            'price_estimate_pence' => $booking->price_estimate_pence,
        ];

        if (array_key_exists('requested_date', $validated)) {
            $booking->scheduled_date = $validated['requested_date'];
            $booking->requested_collection_date = $validated['requested_date'];
        }

        if (array_key_exists('requested_collection_date', $validated)) {
            $booking->requested_collection_date = $validated['requested_collection_date'];
            $booking->scheduled_date = $validated['requested_collection_date'];
        }

        if (array_key_exists('contact_id', $validated)) {
            $booking->contact_id = $validated['contact_id'];
        }

        foreach (['requested_time_window_start', 'requested_time_window_end', 'confirmed_collection_date',
            'confirmed_time_window_start', 'confirmed_time_window_end', 'customer_notes', 'internal_notes'] as $field) {
            if (array_key_exists($field, $validated)) {
                $booking->{$field} = $validated[$field];
                if ($field === 'requested_time_window_start') {
                    $booking->time_window_start = $validated[$field];
                }
                if ($field === 'requested_time_window_end') {
                    $booking->time_window_end = $validated[$field];
                }
                if ($field === 'confirmed_collection_date' && $validated[$field] !== null) {
                    $booking->scheduled_date = $validated[$field];
                }
            }
        }

        foreach (['time_window_start', 'time_window_end'] as $field) {
            if (array_key_exists($field, $validated)) {
                $booking->{$field} = $validated[$field];
                if ($field === 'time_window_start') {
                    $booking->requested_time_window_start = $validated[$field];
                }
                if ($field === 'time_window_end') {
                    $booking->requested_time_window_end = $validated[$field];
                }
            }
        }

        foreach (['estimated_knife_count', 'actual_knife_count'] as $field) {
            if (array_key_exists($field, $validated)) {
                $booking->{$field} = $validated[$field];
            }
        }

        if (array_key_exists('service_type', $validated)) {
            $booking->service_type = ServiceType::from($validated['service_type']);
        }

        if (array_key_exists('price_estimate', $validated)) {
            $booking->price_estimate_pence = $validated['price_estimate'];
        }

        if (! $booking->isDirty()) {
            return $booking;
        }

        $booking->save();

        $after = [
            'scheduled_date' => $booking->scheduled_date,
            'requested_collection_date' => $booking->requested_collection_date,
            'requested_time_window_start' => $booking->requested_time_window_start,
            'requested_time_window_end' => $booking->requested_time_window_end,
            'confirmed_collection_date' => $booking->confirmed_collection_date,
            'confirmed_time_window_start' => $booking->confirmed_time_window_start,
            'confirmed_time_window_end' => $booking->confirmed_time_window_end,
            'contact_id' => $booking->contact_id,
            'time_window_start' => $booking->time_window_start,
            'time_window_end' => $booking->time_window_end,
            'service_type' => $booking->service_type?->value,
            'estimated_knife_count' => $booking->estimated_knife_count,
            'actual_knife_count' => $booking->actual_knife_count,
            'customer_notes' => $booking->customer_notes,
            'internal_notes' => $booking->internal_notes,
            'price_estimate_pence' => $booking->price_estimate_pence,
        ];

        $reqBefore = [
            'requested_collection_date' => $capture['requested_collection_date'],
            'requested_time_window_start' => $capture['requested_time_window_start'],
            'requested_time_window_end' => $capture['requested_time_window_end'],
            'time_window_start' => $capture['time_window_start'],
            'time_window_end' => $capture['time_window_end'],
        ];
        $reqAfter = [
            'requested_collection_date' => $after['requested_collection_date'],
            'requested_time_window_start' => $after['requested_time_window_start'],
            'requested_time_window_end' => $after['requested_time_window_end'],
            'time_window_start' => $after['time_window_start'],
            'time_window_end' => $after['time_window_end'],
        ];

        $confBefore = [
            'confirmed_collection_date' => $capture['confirmed_collection_date'],
            'confirmed_time_window_start' => $capture['confirmed_time_window_start'],
            'confirmed_time_window_end' => $capture['confirmed_time_window_end'],
        ];
        $confAfter = [
            'confirmed_collection_date' => $after['confirmed_collection_date'],
            'confirmed_time_window_start' => $after['confirmed_time_window_start'],
            'confirmed_time_window_end' => $after['confirmed_time_window_end'],
        ];

        if ($reqBefore != $reqAfter) {
            AuditRecorder::record($actor, $booking, 'booking.requested_window_changed', [
                'before' => $reqBefore,
                'after' => $reqAfter,
            ], $request);
        }

        if ($confBefore != $confAfter) {
            AuditRecorder::record($actor, $booking, 'booking.confirmed_window_changed', [
                'before' => $confBefore,
                'after' => $confAfter,
            ], $request);
        }

        $captureSansWindows = $capture;
        unset(
            $captureSansWindows['requested_collection_date'],
            $captureSansWindows['requested_time_window_start'],
            $captureSansWindows['requested_time_window_end'],
            $captureSansWindows['confirmed_collection_date'],
            $captureSansWindows['confirmed_time_window_start'],
            $captureSansWindows['confirmed_time_window_end'],
            $captureSansWindows['time_window_start'],
            $captureSansWindows['time_window_end'],
            $captureSansWindows['scheduled_date'],
        );
        $afterSansWindows = $after;
        unset(
            $afterSansWindows['requested_collection_date'],
            $afterSansWindows['requested_time_window_start'],
            $afterSansWindows['requested_time_window_end'],
            $afterSansWindows['confirmed_collection_date'],
            $afterSansWindows['confirmed_time_window_start'],
            $afterSansWindows['confirmed_time_window_end'],
            $afterSansWindows['time_window_start'],
            $afterSansWindows['time_window_end'],
            $afterSansWindows['scheduled_date'],
        );

        if ($captureSansWindows != $afterSansWindows) {
            AuditRecorder::record($actor, $booking, 'booking.fields_updated', [
                'before' => $captureSansWindows,
                'after' => $afterSansWindows,
            ], $request);
        }

        return $booking->fresh(['company:id,name,city', 'location:id,city']);
    }
}
