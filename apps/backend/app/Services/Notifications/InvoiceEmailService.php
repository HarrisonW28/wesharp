<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Enums\InvoiceStatus;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Support\Invoices\InvoicePresentation;
use App\Support\Invoices\InvoiceRollup;
use App\Support\Money\MoneyFormatting;
use App\Support\Orders\OrderJson;
use App\Support\Portal\CustomerPortalUrls;
use Illuminate\Support\Str;

/**
 * Customer-facing invoice and payment emails (Sprint 10.4).
 */
final class InvoiceEmailService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly InAppNotificationDispatcher $inApp,
    ) {}

    public function sendInvoiceIssued(Invoice $invoice, ?string $resendSalt = null): void
    {
        $invoice = $this->ensureLoaded($invoice);
        $type = 'invoice.issued';

        $idempotencyKey = $resendSalt !== null && $resendSalt !== ''
            ? NotificationService::idempotencyKey($type, Invoice::class, (string) $invoice->id, $resendSalt)
            : NotificationService::idempotencyKey($type, Invoice::class, (string) $invoice->id);

        $invNo = (string) $invoice->invoice_number;
        $greet = $this->greetingName($invoice);
        $tot = MoneyFormatting::formatGbpFromPence((int) $invoice->total_pence);
        $due = $invoice->due_on?->format('j M Y');
        $orderRef = $this->orderReferenceLine($invoice);
        $status = InvoicePresentation::customerStatus($invoice);

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nYour invoice from WeSharp is ready.",
            "Invoice reference: {$invNo}",
            $orderRef,
            'Amount due: '.$tot.'.',
            $due !== null ? "Due date: {$due}." : null,
            'Status: '.$status['label'].'.',
            $status['hint'],
            'You can review the breakdown and pay (when online billing is enabled) in your portal: Account → Invoices.',
            'If anything looks unexpected, reply to this email and we’ll sort it with you.',
        ])));

        $this->queueInvoiceEmail(
            invoice: $invoice,
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: 'Your WeSharp invoice '.$invNo,
            headline: 'Invoice ready',
            body: $body,
            extraView: [
                'invoiceNumber' => $invNo,
                'amountDueFormatted' => $tot,
                'paymentUrl' => null,
            ],
        );
    }

    public function sendPaymentReceived(Invoice $invoice, ?Payment $payment = null): void
    {
        $invoice = $this->ensureLoaded($invoice);
        $type = 'payment.received';

        if ($payment instanceof Payment) {
            $idempotencyKey = NotificationService::idempotencyKey($type, Payment::class, (string) $payment->id);
        } else {
            $idempotencyKey = NotificationService::idempotencyKey($type, Invoice::class, (string) $invoice->id, 'settled_without_new_row');
        }

        $invNo = (string) $invoice->invoice_number;
        $greet = $this->greetingName($invoice);
        $rollup = InvoiceRollup::paymentStatus($invoice);
        $total = (int) $invoice->total_pence;
        $received = (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence);
        $remaining = max(0, $total - $received);

        if ($payment instanceof Payment) {
            $thisAmt = MoneyFormatting::formatGbpFromPence((int) $payment->amount_pence);
            $lead = $rollup === 'paid' || $remaining === 0
                ? "Thanks — we’ve recorded a payment of {$thisAmt} against invoice {$invNo}. Your balance for this invoice is now cleared."
                : "Thanks — we’ve received {$thisAmt} toward invoice {$invNo}.";
        } else {
            $lead = "Thanks — we’ve marked invoice {$invNo} as fully paid. Your balance for this invoice is cleared.";
        }

        $tail = $remaining > 0
            ? 'Amount still due: '.MoneyFormatting::formatGbpFromPence($remaining).'. You can check Account → Invoices in your portal.'
            : 'What happens next: we’ll keep your records up to date — no further action needed for this invoice unless we write separately.';

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\n{$lead}",
            $tail,
            'Questions? Reply to this email.',
        ])));

        $this->queueInvoiceEmail(
            invoice: $invoice,
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: 'Payment received — invoice '.$invNo,
            headline: $remaining > 0 ? 'Partial payment received' : 'Payment received',
            body: $body,
            extraView: [
                'invoiceNumber' => $invNo,
                'amountDueFormatted' => MoneyFormatting::formatGbpFromPence($remaining),
                'paymentUrl' => null,
            ],
        );
    }

    /**
     * Call only from a real payment-provider failure path (e.g. Stripe) — never speculative.
     */
    public function sendPaymentFailed(Invoice $invoice, string $customerSafeReason): void
    {
        $invoice = $this->ensureLoaded($invoice);
        $type = 'payment.failed';
        $idempotencyKey = NotificationService::idempotencyKey(
            $type,
            Invoice::class,
            (string) $invoice->id,
            hash('sha256', $customerSafeReason),
        );

        $invNo = (string) $invoice->invoice_number;
        $greet = $this->greetingName($invoice);
        $reason = Str::limit(trim($customerSafeReason), 400);

        $body = trim(implode("\n\n", [
            "Hi {$greet},\n\nWe couldn’t complete a recent payment attempt for invoice {$invNo}.",
            "Details: {$reason}",
            'No stress — your invoice is still open. You can try again from your portal when convenient, or reply to this email and we’ll help (bank transfer may also be available).',
        ]));

        $this->queueInvoiceEmail(
            invoice: $invoice,
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: 'Payment didn’t go through — invoice '.$invNo,
            headline: 'Payment not completed',
            body: $body,
            extraView: [
                'invoiceNumber' => $invNo,
                'amountDueFormatted' => MoneyFormatting::formatGbpFromPence(max(0, (int) $invoice->total_pence - (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence))),
                'paymentUrl' => null,
            ],
        );
    }

    public function sendInvoiceVoided(Invoice $invoice): void
    {
        $invoice = $this->ensureLoaded($invoice);
        $type = 'invoice.voided';
        $idempotencyKey = NotificationService::idempotencyKey($type, Invoice::class, (string) $invoice->id);

        $invNo = (string) $invoice->invoice_number;
        $greet = $this->greetingName($invoice);

        $body = trim(implode("\n\n", [
            "Hi {$greet},\n\nWe’ve cancelled invoice {$invNo} on our side.",
            'You don’t owe this amount anymore. If you’ve already paid, we’ll be in touch separately if a refund or credit is needed.',
            'If this looks unexpected, reply to this email.',
        ]));

        $this->queueInvoiceEmail(
            invoice: $invoice,
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: 'Invoice '.$invNo.' cancelled',
            headline: 'Invoice cancelled',
            body: $body,
            extraView: [
                'invoiceNumber' => $invNo,
                'amountDueFormatted' => null,
                'paymentUrl' => null,
            ],
        );
    }

    public function sendInvoiceOverdue(Invoice $invoice): void
    {
        $invoice = $this->ensureLoaded($invoice);
        $type = 'invoice.reminder.overdue';
        $idempotencyKey = NotificationService::idempotencyKey($type, Invoice::class, (string) $invoice->id);

        $invNo = (string) $invoice->invoice_number;
        $greet = $this->greetingName($invoice);
        $due = $invoice->due_on?->format('j M Y');
        $outstanding = MoneyFormatting::formatGbpFromPence(max(0, (int) $invoice->total_pence - (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence)));

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nThis is a gentle reminder that invoice {$invNo} is now overdue.",
            $due !== null ? "It was due on {$due}." : null,
            "Amount still outstanding: {$outstanding}.",
            'If you’ve already paid, thanks — it may take a day to show. Otherwise, you can pay from your portal or reply and we’ll help with options.',
        ])));

        $this->queueInvoiceEmail(
            invoice: $invoice,
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: 'Reminder: invoice '.$invNo.' is overdue',
            headline: 'Invoice overdue',
            body: $body,
            extraView: [
                'invoiceNumber' => $invNo,
                'amountDueFormatted' => $outstanding,
                'paymentUrl' => null,
            ],
        );
    }

    public function sendInvoiceDueSoon(Invoice $invoice): void
    {
        $invoice = $this->ensureLoaded($invoice);
        $dueYmd = $invoice->due_on?->toDateString() ?? '';
        $type = 'invoice.reminder.due_soon';
        $idempotencyKey = NotificationService::idempotencyKey($type, Invoice::class, (string) $invoice->id, $dueYmd);

        $invNo = (string) $invoice->invoice_number;
        $greet = $this->greetingName($invoice);
        $due = $invoice->due_on?->format('j M Y');
        $outstanding = MoneyFormatting::formatGbpFromPence(max(0, (int) $invoice->total_pence - (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence)));

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nJust a heads-up: invoice {$invNo} is coming up.",
            $due !== null ? "Due date: {$due}." : null,
            "Amount due: {$outstanding}.",
            'You can pay from your portal under Account → Invoices when you’re ready.',
            'If you need a little longer, reply — we’re happy to talk it through.',
        ])));

        $this->queueInvoiceEmail(
            invoice: $invoice,
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: 'Upcoming due date — invoice '.$invNo,
            headline: 'Invoice due soon',
            body: $body,
            extraView: [
                'invoiceNumber' => $invNo,
                'amountDueFormatted' => $outstanding,
                'paymentUrl' => null,
            ],
        );
    }

    private function greetingName(Invoice $invoice): string
    {
        $order = $invoice->order;
        $c = $order?->booking?->contact;
        if ($c instanceof Contact) {
            $name = trim(trim((string) $c->first_name).' '.trim((string) $c->last_name));
            if ($name !== '') {
                return $name;
            }
        }

        return $invoice->company instanceof Company ? (string) $invoice->company->name : 'there';
    }

    private function orderReferenceLine(Invoice $invoice): ?string
    {
        $order = $invoice->order;
        if ($order === null) {
            return null;
        }

        return 'Linked order reference: '.OrderJson::reference($order).'.';
    }

    private function ensureLoaded(Invoice $invoice): Invoice
    {
        if ($invoice->relationLoaded('company')) {
            $invoice->unsetRelation('company');
        }
        if ($invoice->relationLoaded('order')) {
            $invoice->unsetRelation('order');
        }
        $invoice->loadMissing([
            'company',
            'order.booking.contact',
            'payments',
            'items',
        ]);

        return $invoice;
    }

    /**
     * @param  array<string, mixed|null>  $extraView
     */
    private function queueInvoiceEmail(
        Invoice $invoice,
        string $type,
        string $idempotencyKey,
        string $subject,
        string $headline,
        string $body,
        array $extraView,
    ): void {
        $invoice = $this->ensureLoaded($invoice);
        $to = $this->recipientEmail($invoice);
        $name = $this->recipientName($invoice);

        $ctx = [
            'company_id' => (string) $invoice->company_id,
            'recipient_email' => $to,
            'recipient_name' => $name,
            'source_type' => Invoice::class,
            'source_id' => (string) $invoice->id,
            'meta' => [
                'invoice_number' => $invoice->invoice_number,
            ],
        ];

        if ($to === null || trim($to) === '') {
            $this->notifications->recordEmailDelivery(
                type: $type,
                idempotencyKey: $idempotencyKey,
                ctx: $ctx,
                status: 'failed',
                failureReason: 'No recipient email available for this invoice.',
                meta: [
                    'subject' => $subject,
                    'view' => 'emails.notifications.invoice',
                ],
            );
            $this->fanOutCustomerInApp($invoice, $type, $headline, $body);

            return;
        }

        $viewData = array_merge([
            'headline' => $headline,
            'body' => $body,
            'supportEmail' => config('mail.from.address'),
            'supportPhone' => $invoice->company instanceof Company ? $invoice->company->phone : null,
            'portalUrl' => CustomerPortalUrls::invoices(),
        ], $extraView);

        $this->notifications->queueEmail(
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: $subject,
            view: 'emails.notifications.invoice',
            viewData: $viewData,
            ctx: $ctx,
        );
        $this->fanOutCustomerInApp($invoice, $type, $headline, $body);
    }

    private function fanOutCustomerInApp(Invoice $invoice, string $type, string $headline, string $body): void
    {
        $kind = 'customer.'.$type;
        $snippet = mb_substr(trim(str_replace(["\n", "\r"], ' ', $body)), 0, 280);
        $this->inApp->notifyCustomersInvoicePipeline(
            $invoice,
            $kind,
            $headline,
            $snippet !== '' ? $snippet : $headline,
        );
    }

    private function recipientEmail(Invoice $invoice): ?string
    {
        $order = $invoice->order;
        $c = $order?->booking?->contact;
        if ($c instanceof Contact) {
            $email = trim((string) ($c->email ?? ''));
            if ($email !== '') {
                return $email;
            }
        }

        $company = $invoice->company;
        if ($company instanceof Company) {
            $email = trim((string) ($company->billing_email ?? ''));
            if ($email !== '') {
                return $email;
            }
        }

        return null;
    }

    private function recipientName(Invoice $invoice): ?string
    {
        $order = $invoice->order;
        $c = $order?->booking?->contact;
        if ($c instanceof Contact) {
            $name = trim(trim((string) $c->first_name).' '.trim((string) $c->last_name));

            return $name !== '' ? $name : null;
        }

        return null;
    }
}
