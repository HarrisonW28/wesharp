<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Services\Audit\AuditRecorder;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class UpdateDraftInvoiceLinesAction
{
    /**
     * @param  list<array{description: string, quantity: int, unit_amount_pence: int}>  $lines
     */
    public function execute(Invoice $invoice, array $lines, ?Authenticatable $actor, Request $request): Invoice
    {
        return DB::transaction(function () use ($invoice, $lines, $actor, $request): Invoice {
            $invoice->refresh();

            if ($invoice->invoice_status !== InvoiceStatus::Draft) {
                abort(422, 'Only draft invoices can be edited this way.');
            }

            $invoice->items()->delete();

            $net = 0;
            foreach ($lines as $row) {
                $qty = max(1, (int) $row['quantity']);
                $unit = max(0, (int) $row['unit_amount_pence']);
                $lineTotal = $qty * $unit;
                $net += $lineTotal;

                InvoiceItem::query()->create([
                    /** @phpstan-ignore-next-line */
                    'invoice_id' => $invoice->id,
                    'description' => $row['description'],
                    'quantity' => $qty,
                    'unit_amount_pence' => $unit,
                    'line_total_pence' => $lineTotal,
                ]);
            }

            $tax = (int) round($net * 0.20);
            /** @phpstan-ignore-next-line */
            $invoice->subtotal_pence = $net;
            /** @phpstan-ignore-next-line */
            $invoice->tax_pence = $tax;
            /** @phpstan-ignore-next-line */
            $invoice->total_pence = $net + $tax;
            $invoice->save();

            AuditRecorder::record($actor, $invoice, 'invoice.draft_lines_updated', [
                'line_count' => count($lines),
                'subtotal_pence' => $net,
                'tax_pence' => $tax,
                'total_pence' => $net + $tax,
            ], $request);

            /** @phpstan-ignore-next-line */
            return $invoice->fresh([
                'items' => fn ($q) => $q->orderBy('created_at'),
                'payments',
                'company:id,name,city,billing_email,phone',
                'order:id,booking_id,created_at,order_status',
            ]);
        });
    }
}
