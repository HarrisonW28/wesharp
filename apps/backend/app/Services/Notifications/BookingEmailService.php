<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Contact;
use Illuminate\Support\Str;

final class BookingEmailService
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    public function sendBookingRequested(Booking $booking): void
    {
        $this->send(
            booking: $booking,
            type: 'booking.requested',
            subject: 'We’ve received your booking request',
            headline: 'Booking request received',
            body: $this->bodyRequested($booking),
        );
    }

    public function sendBookingConfirmed(Booking $booking): void
    {
        $this->send(
            booking: $booking,
            type: 'booking.confirmed',
            subject: 'Your WeSharp collection is confirmed',
            headline: 'Collection confirmed',
            body: $this->bodyConfirmed($booking),
        );
    }

    public function sendBookingCancelled(Booking $booking): void
    {
        $this->send(
            booking: $booking,
            type: 'booking.cancelled',
            subject: 'Your WeSharp booking has been cancelled',
            headline: 'Booking cancelled',
            body: $this->bodyCancelled($booking),
        );
    }

    public function reminderPlaceholder(Booking $booking): void
    {
        // Always load full relations (controllers may have loaded partial columns).
        $booking->load(['company', 'location', 'contact']);

        $type = 'booking.reminder.placeholder';
        $idempotencyKey = NotificationService::idempotencyKey($type, Booking::class, (string) $booking->id);

        $this->notifications->recordEmailDelivery(
            type: $type,
            idempotencyKey: $idempotencyKey,
            ctx: [
                'company_id' => (string) $booking->company_id,
                'recipient_email' => $this->recipientEmail($booking),
                'recipient_name' => $this->recipientName($booking),
                'source_type' => Booking::class,
                'source_id' => (string) $booking->id,
                'meta' => ['booking_reference' => BookingResource::reference($booking)],
            ],
            status: 'skipped',
            failureReason: 'Reminder scheduler not enabled yet.',
            meta: ['placeholder' => true],
        );
    }

    private function send(Booking $booking, string $type, string $subject, string $headline, string $body): void
    {
        // Always load full relations (controllers may have loaded partial columns).
        $booking->load(['company', 'location', 'contact']);

        $to = $this->recipientEmail($booking);
        $name = $this->recipientName($booking);

        $idempotencyKey = NotificationService::idempotencyKey($type, Booking::class, (string) $booking->id);

        $ctx = [
            'company_id' => (string) $booking->company_id,
            'recipient_email' => $to,
            'recipient_name' => $name,
            'source_type' => Booking::class,
            'source_id' => (string) $booking->id,
            'meta' => [
                'booking_reference' => BookingResource::reference($booking),
            ],
        ];

        if ($to === null || trim($to) === '') {
            $this->notifications->recordEmailDelivery(
                type: $type,
                idempotencyKey: $idempotencyKey,
                ctx: $ctx,
                status: 'failed',
                failureReason: 'No recipient email available for this booking.',
                meta: [
                    'subject' => $subject,
                    'view' => 'emails.notifications.booking',
                ],
            );

            return;
        }

        $this->notifications->queueEmail(
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: $subject,
            view: 'emails.notifications.booking',
            viewData: [
                'headline' => $headline,
                'body' => $body,
                'supportEmail' => config('mail.from.address'),
                'supportPhone' => $booking->company?->phone,
                'portalUrl' => rtrim((string) config('app.url'), '/').'/account/bookings',
            ],
            ctx: $ctx,
        );
    }

    private function recipientEmail(Booking $booking): ?string
    {
        $c = $booking->contact;
        if ($c instanceof Contact) {
            $email = trim((string) ($c->email ?? ''));
            if ($email !== '') {
                return $email;
            }
        }

        $company = $booking->company;
        if ($company instanceof Company) {
            $email = trim((string) ($company->billing_email ?? ''));
            if ($email !== '') {
                return $email;
            }
        }

        return null;
    }

    private function recipientName(Booking $booking): ?string
    {
        $c = $booking->contact;
        if ($c instanceof Contact) {
            $name = trim(trim((string) $c->first_name).' '.trim((string) $c->last_name));
            return $name !== '' ? $name : null;
        }

        return null;
    }

    private function bodyRequested(Booking $booking): string
    {
        $ref = BookingResource::reference($booking);
        $company = $booking->company?->name ?? 'your business';
        $when = $this->requestedWindowLine($booking);
        $addr = $this->addressLine($booking);

        return trim(implode("\n\n", array_filter([
            "Hi {$company},\n\nThanks — we’ve received your booking request.",
            "Booking reference: {$ref}",
            $when !== null ? "Requested window: {$when}" : null,
            $addr !== null ? "Collection address: {$addr}" : null,
            'You can view or cancel this request in your portal: Account → Bookings.',
            'If anything changes, just reply to this email and we’ll help.',
        ])));
    }

    private function bodyConfirmed(Booking $booking): string
    {
        $ref = BookingResource::reference($booking);
        $company = $booking->company?->name ?? 'your business';
        $when = $this->confirmedWindowLine($booking) ?? $this->requestedWindowLine($booking);
        $addr = $this->addressLine($booking);

        return trim(implode("\n\n", array_filter([
            "Hi {$company},\n\nYour WeSharp collection is confirmed.",
            "Booking reference: {$ref}",
            $when !== null ? "Collection window: {$when}" : null,
            $addr !== null ? "Collection address: {$addr}" : null,
            'You can find this booking in your portal: Account → Bookings.',
            'If you need to change the time or cancel, reply to this email and we’ll sort it.',
        ])));
    }

    private function bodyCancelled(Booking $booking): string
    {
        $ref = BookingResource::reference($booking);
        $company = $booking->company?->name ?? 'your business';
        $reason = trim((string) ($booking->cancellation_reason ?? ''));
        $reasonLine = $reason !== '' ? Str::limit($reason, 220) : null;

        return trim(implode("\n\n", array_filter([
            "Hi {$company},\n\nYour booking has been cancelled.",
            "Booking reference: {$ref}",
            $reasonLine !== null ? "Reason: {$reasonLine}" : null,
            'If you still need a collection, you can create a new booking in your portal: Account → Bookings.',
        ])));
    }

    private function requestedWindowLine(Booking $booking): ?string
    {
        $d = $booking->requested_collection_date ?? $booking->scheduled_date;
        $start = $booking->requested_time_window_start ?? $booking->time_window_start;
        $end = $booking->requested_time_window_end ?? $booking->time_window_end;
        if ($d === null) {
            return null;
        }
        $date = $d->format('D j M Y');
        $w = $this->timeWindow($start, $end);

        return $w !== null ? "{$date} · {$w}" : $date;
    }

    private function confirmedWindowLine(Booking $booking): ?string
    {
        $d = $booking->confirmed_collection_date ?? $booking->scheduled_date;
        $start = $booking->confirmed_time_window_start;
        $end = $booking->confirmed_time_window_end;
        if ($d === null) {
            return null;
        }
        $date = $d->format('D j M Y');
        $w = $this->timeWindow($start, $end);

        return $w !== null ? "{$date} · {$w}" : $date;
    }

    private function timeWindow(?string $start, ?string $end): ?string
    {
        $s = trim((string) ($start ?? ''));
        $e = trim((string) ($end ?? ''));
        if ($s === '' && $e === '') {
            return null;
        }
        $s = $s !== '' ? substr($s, 0, 5) : '—';
        $e = $e !== '' ? substr($e, 0, 5) : '—';

        return "{$s}–{$e}";
    }

    private function addressLine(Booking $booking): ?string
    {
        $loc = $booking->location;
        if ($loc === null) {
            return null;
        }

        $parts = array_values(array_filter([
            $loc->label,
            $loc->line_one,
            $loc->line_two,
            $loc->city,
            $loc->postcode,
        ], static fn ($p) => is_string($p) && trim($p) !== ''));

        return $parts === [] ? null : implode(', ', array_map('trim', $parts));
    }
}

