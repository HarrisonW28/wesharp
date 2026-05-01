<?php

declare(strict_types=1);

namespace App\Support\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;

/** Customer-safe copy for portal; never exposes internal workflow jargon. */
final readonly class InvoicePresentation
{
    /**
     * Primary badge for customers — blends lifecycle + settlement when partial.
     *
     * @return array{label: string, hint: string|null}
     */
    public static function customerStatus(Invoice $invoice): array
    {
        $status = $invoice->invoice_status;
        $payment = InvoiceRollup::paymentStatus($invoice);
        $pastDue = InvoiceRollup::isPastDue($invoice);

        if ($status === InvoiceStatus::Void) {
            return ['label' => 'Cancelled', 'hint' => 'This invoice is no longer payable.'];
        }

        if ($status === InvoiceStatus::Paid || $payment === 'paid') {
            return ['label' => 'Paid', 'hint' => null];
        }

        if ($payment === 'partial') {
            $hint = 'Part of the balance has been received; the remainder is still due.';

            return $pastDue
                ? ['label' => 'Partially paid · overdue', 'hint' => $hint]
                : ['label' => 'Partially paid', 'hint' => $hint];
        }

        if ($pastDue || $status === InvoiceStatus::Overdue) {
            return ['label' => 'Overdue', 'hint' => 'The due date has passed. Please pay or contact us if you need help.'];
        }

        if ($status === InvoiceStatus::Sent) {
            return ['label' => 'Payment due', 'hint' => null];
        }

        return ['label' => 'In preparation', 'hint' => null];
    }
}
