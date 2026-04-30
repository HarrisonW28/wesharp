<?php

namespace App\Support\Orders;

use App\Models\Invoice;
use App\Models\Knife;
use App\Models\Order;
use App\Models\OrderItem;
use App\Support\Knives\KnifeJson;

final class OrderJson
{
    /** @return array<string, mixed> */
    public static function invoiceEmbed(Invoice $invoice): array
    {
        return [
            'id' => (string) $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'status' => $invoice->invoice_status?->value,
            'subtotal_pence' => (int) $invoice->subtotal_pence,
            'tax_pence' => (int) $invoice->tax_pence,
            'total_pence' => (int) $invoice->total_pence,
        ];
    }

    /** @return array<string, mixed> */
    public static function listRow(Order $order): array
    {
        return [
            'id' => (string) $order->id,
            'company_id' => (string) $order->company_id,
            'booking_id' => (string) $order->booking_id,
            'route_id' => $order->route_id !== null ? (string) $order->route_id : null,
            'status' => $order->order_status?->value,
            'knife_count' => $order->knife_count,
            'price_per_knife_pence' => $order->price_per_knife_pence,
            'discount_pence' => $order->discount_pence,
            'subtotal_pence' => $order->subtotal_pence,
            'tax_pence' => $order->tax_pence,
            'total_pence' => $order->total_pence,
            'currency' => $order->currency,
            'payment_status' => $order->payment_status?->value,
            'company' => $order->relationLoaded('company') && $order->company !== null ? [
                'name' => $order->company->name,
                'city' => $order->company->city,
            ] : null,
            'scheduled_date' => $order->booking?->scheduled_date?->format('Y-m-d'),
            'route_name' => $order->operationalRoute?->name,
            'updated_at' => $order->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(Order $order): array
    {
        $payload = array_merge(self::listRow($order), [
            'knives' => $order->relationLoaded('knives')
                ? $order->knives->map(fn (Knife $k) => KnifeJson::summary($k))->values()->all()
                : [],
            'items' => $order->relationLoaded('items')
                ? $order->items->map(fn (OrderItem $i): array => [
                    'id' => (string) $i->id,
                    'knife_id' => $i->knife_id !== null ? (string) $i->knife_id : null,
                    'description' => $i->description,
                    'quantity' => (int) $i->quantity,
                    'unit_amount_pence' => (int) $i->unit_amount_pence,
                ])->values()->all()
                : [],
        ]);

        $payload['created_at'] = $order->created_at?->toIso8601String();
        $payload['completed_at'] = $order->completed_at?->toIso8601String();

        $activeInvoice = null;
        if ($order->relationLoaded('invoices')) {
            /** @phpstan-ignore-next-line */
            $activeInvoice = $order->invoices->first();
        }
        $payload['invoice'] = $activeInvoice instanceof Invoice
            ? self::invoiceEmbed($activeInvoice)
            : null;

        return $payload;
    }
}
