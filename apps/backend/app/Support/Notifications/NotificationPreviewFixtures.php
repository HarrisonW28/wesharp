<?php

declare(strict_types=1);

namespace App\Support\Notifications;

use Illuminate\Support\Facades\View;

/**
 * Fixture HTML previews for admin template QA (does not send mail).
 */
final class NotificationPreviewFixtures
{
    /**
     * @return array{view: string, subject: string, data: array<string, mixed>}
     */
    public function forPreset(string $preset): array
    {
        return match ($preset) {
            'booking' => [
                'view' => 'emails.notifications.booking',
                'subject' => '[Preview] Booking template',
                'data' => [
                    'headline' => 'Collection confirmed',
                    'body' => "Hi Demo Kitchen,\n\nYour WeSharp collection is confirmed.\n\nBooking reference: WS-DEMO-BOOK\n\nCollection window: Mon 12 Jan 2026 · 09:00–11:00",
                    'supportEmail' => config('mail.from.address'),
                    'supportPhone' => '+44 161 000 0000',
                    'portalUrl' => rtrim((string) config('wesharp.customer_portal_base_url', config('app.url')), '/').'/account/bookings',
                ],
            ],
            'order' => [
                'view' => 'emails.notifications.order',
                'subject' => '[Preview] Order template',
                'data' => [
                    'headline' => 'New sharpening order',
                    'body' => "Hi Riley,\n\nThanks — we’ve opened a sharpening order for you.\n\nOrder reference: WS-DEMO-ORD",
                    'orderReference' => 'WS-DEMO-ORD',
                    'supportEmail' => config('mail.from.address'),
                    'supportPhone' => '+44 161 000 0000',
                    'portalUrl' => rtrim((string) config('wesharp.customer_portal_base_url', config('app.url')), '/').'/account/orders',
                ],
            ],
            'invoice' => [
                'view' => 'emails.notifications.invoice',
                'subject' => '[Preview] Invoice template',
                'data' => [
                    'headline' => 'Invoice issued',
                    'body' => "Hi Demo Kitchen,\n\nYour latest WeSharp invoice is ready to view in the portal.\n\nIf anything looks unclear, reply to this email.",
                    'invoiceNumber' => 'INV-DEMO-001',
                    'amountDueFormatted' => '£120.00',
                    'paymentUrl' => null,
                    'supportEmail' => config('mail.from.address'),
                    'supportPhone' => '+44 161 000 0000',
                    'portalUrl' => rtrim((string) config('wesharp.customer_portal_base_url', config('app.url')), '/').'/account/invoices',
                ],
            ],
            'subscription' => [
                'view' => 'emails.notifications.subscription',
                'subject' => '[Preview] Subscription template',
                'data' => [
                    'headline' => 'Subscription renewal coming up',
                    'body' => "Hi there,\n\nYour subscription renews soon — here’s a friendly heads-up with your reference below.",
                    'subscriptionReference' => 'SUB-DEMO-1',
                    'planName' => 'Demo Kitchen Care',
                    'supportEmail' => config('mail.from.address'),
                    'supportPhone' => '+44 161 000 0000',
                    'portalSubscriptionUrl' => rtrim((string) config('wesharp.customer_portal_base_url', config('app.url')), '/').'/account/subscription',
                ],
            ],
            default => [
                'view' => 'emails.notifications.generic',
                'subject' => '[Preview] Generic template',
                'data' => [
                    'headline' => 'Preview message',
                    'body' => 'This is static fixture text for checking layout, typography, and button styles.',
                    'ctaUrl' => rtrim((string) config('wesharp.customer_portal_base_url', config('app.url')), '/').'/account/dashboard',
                    'ctaLabel' => 'Open your portal',
                ],
            ],
        };
    }

    public function renderHtml(string $preset): array
    {
        $payload = $this->forPreset($preset);

        return [
            'subject' => $payload['subject'],
            'html' => View::make($payload['view'], $payload['data'])->render(),
        ];
    }
}
