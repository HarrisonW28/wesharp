<?php

declare(strict_types=1);

namespace App\Support\Orders;

use App\Enums\OrderStatus;
use App\Models\OrderFeedback;

final class OrderFeedbackJson
{
    /** @return array<string, mixed> */
    public static function portal(OrderFeedback $f): array
    {
        $f->loadMissing('order:id,order_status');

        return [
            'id' => (string) $f->id,
            'invitation_sent_at' => $f->invitation_sent_at?->toIso8601String(),
            'can_submit' => $f->submitted_at === null && $f->order?->order_status === OrderStatus::Completed,
            'submitted_at' => $f->submitted_at?->toIso8601String(),
            'rating' => $f->rating,
            'comment' => $f->comment,
            'testimonial_interested' => (bool) $f->testimonial_interested,
        ];
    }

    /** @return array<string, mixed> */
    public static function adminRow(OrderFeedback $f): array
    {
        $f->loadMissing([
            'order' => fn ($q) => $q
                ->select(['id', 'company_id', 'booking_id', 'route_id', 'order_status', 'completed_at', 'created_at'])
                ->with([
                    'booking:id,contact_id',
                    'booking.contact:id,first_name,last_name,email',
                    'operationalRoute:id,name,scheduled_date',
                ]),
        ]);

        $order = $f->order;

        return [
            'id' => (string) $f->id,
            'order_id' => (string) $f->order_id,
            'order_reference' => $order !== null ? OrderJson::reference($order) : null,
            'booking_id' => (string) ($order?->booking_id ?? ''),
            'route' => $order?->operationalRoute !== null ? [
                'id' => (string) $order->operationalRoute->id,
                'name' => $order->operationalRoute->name,
                'scheduled_date' => $order->operationalRoute->scheduled_date?->format('Y-m-d'),
            ] : null,
            'contact' => $order?->booking?->contact !== null ? [
                'name' => trim(trim((string) $order->booking->contact->first_name).' '.trim((string) $order->booking->contact->last_name)),
                'email' => $order->booking->contact->email,
            ] : null,
            'invitation_sent_at' => $f->invitation_sent_at?->toIso8601String(),
            'submitted_at' => $f->submitted_at?->toIso8601String(),
            'rating' => $f->rating,
            'comment' => $f->comment,
            'testimonial_interested' => (bool) $f->testimonial_interested,
            'staff_reviewed_at' => $f->staff_reviewed_at?->toIso8601String(),
            'testimonial_marketing_approved_at' => $f->testimonial_marketing_approved_at?->toIso8601String(),
        ];
    }
}
