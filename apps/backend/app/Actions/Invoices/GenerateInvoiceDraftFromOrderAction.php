<?php

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Enums\OrderStatus;
use App\Models\Invoice;
use App\Models\Order;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class GenerateInvoiceDraftFromOrderAction
{
    public function __construct(
        private readonly CreateInvoiceFromOrderAction $createInvoiceFromOrderAction,
    ) {}

    /**
     * @return array{invoice: Invoice, already_existed: bool}
     */
    public function execute(Order $order, ?Authenticatable $actor, Request $request): array
    {
        if ($order->order_status !== OrderStatus::Completed) {
            abort(422, 'Order must be completed before generating an invoice draft.');
        }

        /** @phpstan-ignore-next-line */
        $existing = Invoice::query()
            ->where('order_id', $order->id)
            ->where('invoice_status', '!=', InvoiceStatus::Void->value)
            ->first();

        if ($existing !== null) {
            /** @phpstan-ignore-next-line */
            return [
                'invoice' => $existing->fresh([
                    'company:id,name,city',
                    'order:id,booking_id',
                    'items',
                    'payments',
                ]),
                'already_existed' => true,
            ];
        }

        /** @phpstan-ignore-next-line */
        $invoice = $this->createInvoiceFromOrderAction->execute(
            $order,
            $actor,
            $request,
            null,
            'invoice.draft_generated',
        );

        return ['invoice' => $invoice, 'already_existed' => false];
    }
}
