<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Enums\OrderStatus;
use App\Models\Company;
use App\Models\Contact;
use App\Models\DamageReport;
use App\Models\Order;
use App\Support\Orders\OrderJson;
use App\Support\Orders\OrderStatusPresentation;
use App\Support\Portal\CustomerPortalUrls;
use Illuminate\Support\Str;

final class OrderEmailService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly InAppNotificationDispatcher $inApp,
    ) {}

    public function sendOrderCreated(Order $order): void
    {
        $order = $this->ensureLoaded($order);
        $type = 'order.created';
        $ref = OrderJson::reference($order);
        $greet = $this->greetingName($order);
        $statusLabel = OrderStatusPresentation::customerLabel($order->order_status);

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nThanks — we’ve opened a sharpening order for you.",
            "Order reference: {$ref}",
            "Where things stand: {$statusLabel}.",
            $this->estimateLine($order),
            'Follow progress any time in your portal under Account → Orders.',
            'If something doesn’t look right, reply to this email and we’ll help.',
        ])));

        $this->send(
            order: $order,
            type: $type,
            subject: 'Your WeSharp order is open',
            headline: 'New sharpening order',
            body: $body,
        );
    }

    /**
     * @param  OrderStatus  $reached  Status after transition (not Draft / Cancelled — use dedicated sends).
     */
    public function sendStatusReached(Order $order, OrderStatus $reached): void
    {
        if (in_array($reached, [OrderStatus::Draft, OrderStatus::Cancelled], true)) {
            return;
        }

        $order = $this->ensureLoaded($order);
        $map = self::statusEmailMap();
        if (! isset($map[$reached->value])) {
            return;
        }

        /** @var array{subject: string, headline: string} $meta */
        $meta = $map[$reached->value];
        $ref = OrderJson::reference($order);
        $greet = $this->greetingName($order);
        $label = OrderStatusPresentation::customerLabel($reached);

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\n".$this->statusNarrative($reached),
            "Order reference: {$ref}",
            "Status: {$label}.",
            $this->nextStepLine($reached, $order),
            $this->estimateLine($order),
            'You can read a plain-English summary in your portal: Account → Orders.',
        ])));

        $type = 'order.status.'.$reached->value;

        $this->send(
            order: $order,
            type: $type,
            subject: $meta['subject'],
            headline: $meta['headline'],
            body: $body,
        );
    }

    public function sendOrderCancelled(Order $order, ?string $reason = null): void
    {
        $order = $this->ensureLoaded($order);
        $ref = OrderJson::reference($order);
        $greet = $this->greetingName($order);
        $reasonLine = $reason !== null && trim($reason) !== '' ? Str::limit(trim($reason), 220) : null;

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nWe’ve cancelled this sharpening order as requested (or due to an operations change on our side).",
            "Order reference: {$ref}",
            $reasonLine !== null ? "Note from the team: {$reasonLine}" : null,
            'If you still need knives sharpened, you can start a fresh booking from your portal when you’re ready.',
            'Questions? Just reply — we’re happy to help.',
        ])));

        $this->send(
            order: $order,
            type: 'order.cancelled',
            subject: 'Your WeSharp order has been cancelled',
            headline: 'Order cancelled',
            body: $body,
        );
    }

    /** Customer-visible damage / issue logged against an order. */
    public function sendDamageReportCustomerVisible(DamageReport $report): void
    {
        if (! $report->customer_visible) {
            return;
        }

        $report->loadMissing(['order' => fn ($q) => $q->with(['company', 'booking.contact'])]);
        $order = $report->order;
        if ($order === null) {
            return;
        }

        $order = $this->ensureLoaded($order);
        $ref = OrderJson::reference($order);
        $greet = $this->greetingName($order);
        $customerNote = trim((string) ($report->customer_description ?? ''));
        $visible = $customerNote !== '' ? $customerNote : 'We’ve recorded an issue with one or more blades on this order.';

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nWe wanted to let you know we’ve noted something during service.",
            "Order reference: {$ref}",
            $visible,
            'We’ll handle your blades carefully and keep you updated. If you have questions, reply to this email.',
            'Account → Orders has the latest status.',
        ])));

        $type = 'order.issue_reported';
        $idempotencyKey = NotificationService::idempotencyKey($type, DamageReport::class, (string) $report->id);

        $this->queueOrderEmail(
            order: $order,
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: 'Update on your WeSharp order',
            headline: 'An update from the workshop',
            body: $body,
        );
    }

    /** Single invitation per order (idempotent). In-app notification is sent separately with a #feedback deep link. */
    public function sendFeedbackInvite(Order $order): void
    {
        $order = $this->ensureLoaded($order);
        $ref = OrderJson::reference($order);
        $greet = $this->greetingName($order);
        $type = 'order.feedback_invite';
        $idempotencyKey = NotificationService::idempotencyKey($type, Order::class, (string) $order->id);

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nYour sharpening work on this order is complete — thank you for choosing WeSharp.",
            "Order reference: {$ref}",
            'When you have a moment, a quick 1–5 rating in your portal helps us improve.',
            'You can leave an optional comment and say if you’d be open to a testimonial follow-up (entirely optional).',
        ])));

        $this->queueOrderEmail(
            order: $order,
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: 'Quick feedback on your WeSharp order?',
            headline: 'How was your experience?',
            body: $body,
            fanOutInApp: false,
        );
    }

    /**
     * @return array<string, array{subject: string, headline: string}>
     */
    private static function statusEmailMap(): array
    {
        return [
            OrderStatus::Received->value => [
                'subject' => 'We’ve received your knives',
                'headline' => 'Your knives are with us',
            ],
            OrderStatus::Inspection->value => [
                'subject' => 'We’re inspecting your knives',
                'headline' => 'Inspection underway',
            ],
            OrderStatus::InProgress->value => [
                'subject' => 'Sharpening is in progress',
                'headline' => 'Workshop progress',
            ],
            OrderStatus::QualityCheck->value => [
                'subject' => 'Final quality check',
                'headline' => 'Almost there — quality check',
            ],
            OrderStatus::Completed->value => [
                'subject' => 'Your sharpening work is finished',
                'headline' => 'Work completed',
            ],
            OrderStatus::Invoiced->value => [
                'subject' => 'Your invoice is ready',
                'headline' => 'Invoice issued',
            ],
            OrderStatus::Returned->value => [
                'subject' => 'Your knives are heading back',
                'headline' => 'Return / delivery',
            ],
        ];
    }

    private function statusNarrative(OrderStatus $status): string
    {
        return match ($status) {
            OrderStatus::Received => 'Your knives have arrived safely at our workshop. Thank you for trusting WeSharp with them.',
            OrderStatus::Inspection => 'We’re taking a careful look at each blade before sharpening — it’s a quick, routine check.',
            OrderStatus::InProgress => 'Our team is now sharpening and refurbishing your knives.',
            OrderStatus::QualityCheck => 'We’re doing a final quality check so everything meets our standard before we pack up.',
            OrderStatus::Completed => 'The workshop work on this order is complete. We’ll move on to invoicing and getting everything back to you.',
            OrderStatus::Invoiced => 'There’s an invoice ready for this order. When payment is sorted, we’ll line up return or hand-back as agreed.',
            OrderStatus::Returned => 'Your knives are on their way back (or ready for collection), depending on what we arranged.',
            default => 'There’s an update on your order.',
        };
    }

    private function nextStepLine(OrderStatus $status, Order $order): ?string
    {
        return match ($status) {
            OrderStatus::Received => 'Next we’ll inspect each item, then move into sharpening.',
            OrderStatus::Inspection => 'Next up: sharpening once we’re happy with the intake notes.',
            OrderStatus::InProgress => 'We’ll let you move to quality check as each batch finishes.',
            OrderStatus::QualityCheck => 'After this step we’ll finalise the order and prepare your invoice if there’s a balance due.',
            OrderStatus::Completed => 'We’ll issue any invoice if there’s a balance due, then arrange return or hand-back as planned. Check Account → Orders and Invoices for updates.',
            OrderStatus::Invoiced => 'Please review your invoice in the portal when you can. If anything looks off, message us.',
            OrderStatus::Returned => 'If you haven’t received them when expected, reply and we’ll trace them.',
            default => null,
        };
    }

    private function estimateLine(Order $order): ?string
    {
        $d = $order->booking?->scheduled_date;
        if ($d === null) {
            return null;
        }

        return 'Planned collection / route context (if we set one with you): '.$d->format('D j M Y').'.';
    }

    private function greetingName(Order $order): string
    {
        $c = $order->booking?->contact;
        if ($c instanceof Contact) {
            $name = trim(trim((string) $c->first_name).' '.trim((string) $c->last_name));
            if ($name !== '') {
                return $name;
            }
        }

        return $order->company?->name ?? 'there';
    }

    private function ensureLoaded(Order $order): Order
    {
        if ($order->relationLoaded('company')) {
            $order->unsetRelation('company');
        }
        if ($order->relationLoaded('booking')) {
            $order->unsetRelation('booking');
        }
        $order->loadMissing(['company', 'booking.contact']);

        return $order;
    }

    private function send(Order $order, string $type, string $subject, string $headline, string $body): void
    {
        $idempotencyKey = NotificationService::idempotencyKey($type, Order::class, (string) $order->id);

        $this->queueOrderEmail(
            order: $order,
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: $subject,
            headline: $headline,
            body: $body,
        );
    }

    private function queueOrderEmail(
        Order $order,
        string $type,
        string $idempotencyKey,
        string $subject,
        string $headline,
        string $body,
        bool $fanOutInApp = true,
    ): void {
        $order = $this->ensureLoaded($order);
        $to = $this->recipientEmail($order);
        $name = $this->recipientName($order);

        $ctx = [
            'company_id' => (string) $order->company_id,
            'recipient_email' => $to,
            'recipient_name' => $name,
            'source_type' => Order::class,
            'source_id' => (string) $order->id,
            'meta' => [
                'order_reference' => OrderJson::reference($order),
            ],
        ];

        if ($to === null || trim($to) === '') {
            $this->notifications->recordEmailDelivery(
                type: $type,
                idempotencyKey: $idempotencyKey,
                ctx: $ctx,
                status: 'failed',
                failureReason: 'No recipient email available for this order.',
                meta: [
                    'subject' => $subject,
                    'view' => 'emails.notifications.order',
                ],
            );
            $fanOutInApp && $this->fanOutCustomerInApp($order, $type, $headline, $body);

            return;
        }

        $this->notifications->queueEmail(
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: $subject,
            view: 'emails.notifications.order',
            viewData: [
                'headline' => $headline,
                'body' => $body,
                'orderReference' => OrderJson::reference($order),
                'supportEmail' => config('mail.from.address'),
                'supportPhone' => $order->company instanceof Company ? $order->company->phone : null,
                'portalUrl' => CustomerPortalUrls::orders(),
            ],
            ctx: $ctx,
        );
        $fanOutInApp && $this->fanOutCustomerInApp($order, $type, $headline, $body);
    }

    private function fanOutCustomerInApp(Order $order, string $type, string $headline, string $body): void
    {
        $kind = 'customer.'.$type;
        $snippet = mb_substr(trim(str_replace(["\n", "\r"], ' ', $body)), 0, 280);
        $this->inApp->notifyCustomersOrderPipeline(
            $order,
            $kind,
            $headline,
            $snippet !== '' ? $snippet : $headline,
        );
    }

    private function recipientEmail(Order $order): ?string
    {
        $c = $order->booking?->contact;
        if ($c instanceof Contact) {
            $email = trim((string) ($c->email ?? ''));
            if ($email !== '') {
                return $email;
            }
        }

        $company = $order->company;
        if ($company instanceof Company) {
            $email = trim((string) ($company->billing_email ?? ''));
            if ($email !== '') {
                return $email;
            }
        }

        return null;
    }

    private function recipientName(Order $order): ?string
    {
        $c = $order->booking?->contact;
        if ($c instanceof Contact) {
            $name = trim(trim((string) $c->first_name).' '.trim((string) $c->last_name));

            return $name !== '' ? $name : null;
        }

        return null;
    }
}
