<?php

namespace App\Support\Orders;

use App\Http\Resources\BookingResource;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\Order;
use App\Models\OrderItem;
use App\Support\Audit\AuditLogPresenter;
use App\Support\Knives\KnifeJson;
use App\Support\Money\MoneyFormatting;
use Illuminate\Support\Collection;

final class OrderJson
{
    public static function reference(Order $order): string
    {
        $hex = str_replace('-', '', (string) $order->id);

        return 'OR-'.strtoupper(substr($hex, 0, 8));
    }

    /** @return array<string, mixed> */
    public static function portalInvoice(Invoice $invoice): array
    {
        $sub = (int) $invoice->subtotal_pence;
        $tax = (int) $invoice->tax_pence;
        $tot = (int) $invoice->total_pence;

        return [
            'id' => (string) $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'status' => $invoice->invoice_status?->value,
            'subtotal_pence' => $sub,
            'tax_pence' => $tax,
            'total_pence' => $tot,
            'formatted_subtotal' => MoneyFormatting::formatGbpFromPence($sub),
            'formatted_tax' => MoneyFormatting::formatGbpFromPence($tax),
            'formatted_total' => MoneyFormatting::formatGbpFromPence($tot),
        ];
    }

    public static function displayReference(Order $order): string
    {
        $d = $order->created_at?->format('j M Y');

        return $d !== null ? 'Order · '.$d : 'Your order';
    }

    /**
     * Tenant account list — excludes route IDs/names and cross-entity UUIDs customers should not see in the UI.
     *
     * @return array<string, mixed>
     */
    public static function portalListRow(Order $order): array
    {
        return [
            'id' => (string) $order->id,
            'display_reference' => self::displayReference($order),
            'status' => $order->order_status?->value,
            'payment_status' => $order->payment_status?->value,
            'knife_count' => $order->knife_count,
            'subtotal_pence' => (int) $order->subtotal_pence,
            'tax_pence' => (int) $order->tax_pence,
            'total_pence' => (int) $order->total_pence,
            'formatted_subtotal' => MoneyFormatting::formatGbpFromPence((int) $order->subtotal_pence),
            'formatted_tax' => MoneyFormatting::formatGbpFromPence((int) $order->tax_pence),
            'formatted_total' => MoneyFormatting::formatGbpFromPence((int) $order->total_pence),
            'formatted_amount' => MoneyFormatting::formatGbpFromPence((int) $order->total_pence),
            'total_amount_minor' => (int) $order->total_pence,
            'currency' => $order->currency,
            'company' => $order->relationLoaded('company') && $order->company !== null ? [
                'name' => $order->company->name,
                'city' => $order->company->city,
            ] : null,
            'scheduled_date' => $order->booking?->scheduled_date?->format('Y-m-d'),
            'booking' => $order->booking !== null ? [
                'id' => (string) $order->booking_id,
                'scheduled_date' => $order->booking->scheduled_date?->format('Y-m-d'),
                'status' => $order->booking->booking_status?->value,
            ] : null,
            'created_at' => $order->created_at?->toIso8601String(),
            'updated_at' => $order->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Tenant account detail — knives/items without internal IDs; invoice summary when present.
     *
     * @return array<string, mixed>
     */
    public static function portalDetail(Order $order): array
    {
        $payload = self::portalListRow($order);
        $payload['completed_at'] = $order->completed_at?->toIso8601String();
        $payload['knives'] = $order->relationLoaded('knives')
            ? $order->knives->map(fn (Knife $k) => KnifeJson::portalSummary($k))->values()->all()
            : [];
        $payload['items'] = $order->relationLoaded('items')
            ? $order->items->map(function (OrderItem $i): array {
                $qty = (int) $i->quantity;
                $unit = (int) $i->unit_amount_pence;
                $line = $qty * $unit;

                return [
                    'description' => $i->description,
                    'quantity' => $qty,
                    'unit_amount_pence' => $unit,
                    'line_total_pence' => $line,
                    'formatted_unit_amount' => MoneyFormatting::formatGbpFromPence($unit),
                    'formatted_line_total' => MoneyFormatting::formatGbpFromPence($line),
                ];
            })->values()->all()
            : [];

        $activeInvoice = null;
        if ($order->relationLoaded('invoices')) {
            /** @phpstan-ignore-next-line */
            $activeInvoice = $order->invoices->first();
        }
        $payload['invoice'] = $activeInvoice instanceof Invoice
            ? self::portalInvoice($activeInvoice)
            : null;

        return $payload;
    }

    /** @return array<string, mixed> */
    public static function invoiceEmbed(Invoice $invoice): array
    {
        $sub = (int) $invoice->subtotal_pence;
        $tax = (int) $invoice->tax_pence;
        $tot = (int) $invoice->total_pence;

        $out = [
            'id' => (string) $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'status' => $invoice->invoice_status?->value,
            'subtotal_pence' => $sub,
            'tax_pence' => $tax,
            'total_pence' => $tot,
            'total_amount_minor' => $tot,
            'formatted_amount' => MoneyFormatting::formatGbpFromPence($tot),
            'formatted_subtotal' => MoneyFormatting::formatGbpFromPence($sub),
            'formatted_tax' => MoneyFormatting::formatGbpFromPence($tax),
            'formatted_total' => MoneyFormatting::formatGbpFromPence($tot),
        ];

        if ($invoice->relationLoaded('items') && $invoice->items->isNotEmpty()) {
            $out['line_items'] = $invoice->items->map(function ($item) {
                $qty = (int) $item->quantity;
                $unit = (int) $item->unit_amount_pence;
                $line = (int) ($item->line_total_pence ?? ($qty * $unit));

                return [
                    'description' => $item->description,
                    'quantity' => $qty,
                    'unit_amount_pence' => $unit,
                    'line_total_pence' => $line,
                    'formatted_unit_amount' => MoneyFormatting::formatGbpFromPence($unit),
                    'formatted_line_total' => MoneyFormatting::formatGbpFromPence($line),
                ];
            })->values()->all();
        }

        return $out;
    }

    /**
     * @param  Collection<int, AuditLog>  $auditRows  Newest-first audit rows for this order.
     *
     * @return list<array<string, mixed>>
     */
    public static function statusTimeline(Order $order, Collection $auditRows): array
    {
        $milestones = [
            [
                'key' => 'created',
                'label' => 'Order created',
                'at' => $order->created_at?->toIso8601String(),
            ],
        ];

        $activated = $auditRows->first(fn (AuditLog $r) => $r->action === 'order.activated');
        if ($activated !== null) {
            $milestones[] = [
                'key' => 'active',
                'label' => 'Marked active',
                'at' => $activated->created_at?->toIso8601String(),
            ];
        }

        $completed = $auditRows->first(fn (AuditLog $r) => $r->action === 'order.completed');
        if ($completed !== null) {
            $milestones[] = [
                'key' => 'completed',
                'label' => 'Completed',
                'at' => $completed->created_at?->toIso8601String(),
            ];
        } elseif ($order->completed_at !== null) {
            $milestones[] = [
                'key' => 'completed',
                'label' => 'Completed',
                'at' => $order->completed_at->toIso8601String(),
            ];
        }

        $cancelled = $auditRows->first(fn (AuditLog $r) => $r->action === 'order.cancelled');
        if ($cancelled !== null) {
            $milestones[] = [
                'key' => 'cancelled',
                'label' => 'Cancelled',
                'at' => $cancelled->created_at?->toIso8601String(),
            ];
        }

        return $milestones;
    }

    /** @return array<string, mixed>|null */
    public static function bookingAdminEmbed(Order $order): ?array
    {
        if (! $order->relationLoaded('booking') || $order->booking === null) {
            return null;
        }

        $b = $order->booking;

        $contact = $b->relationLoaded('contact') && $b->contact !== null
            ? [
                'name' => trim($b->contact->first_name.' '.$b->contact->last_name),
                'email' => $b->contact->email,
                'phone' => $b->contact->phone,
            ]
            : null;

        $location = $b->relationLoaded('location') && $b->location !== null
            ? [
                'label' => $b->location->label,
                'line_one' => $b->location->line_one,
                'city' => $b->location->city,
                'postcode' => $b->location->postcode,
            ]
            : null;

        return [
            'id' => (string) $b->id,
            'reference' => BookingResource::reference($b),
            'scheduled_date' => $b->scheduled_date?->format('Y-m-d'),
            'status' => $b->booking_status?->value,
            'contact' => $contact,
            'location' => $location,
        ];
    }

    /** @return array<string, mixed> */
    public static function listRow(Order $order): array
    {
        $billableLines = isset($order->billable_lines_count) ? (int) $order->billable_lines_count : null;
        $knivesReg = isset($order->knives_registered_count) ? (int) $order->knives_registered_count : null;

        return [
            'id' => (string) $order->id,
            'reference' => self::reference($order),
            'company_id' => (string) $order->company_id,
            'booking_id' => (string) $order->booking_id,
            'route_id' => $order->route_id !== null ? (string) $order->route_id : null,
            'status' => $order->order_status?->value,
            'knife_count' => $order->knife_count,
            'billable_lines_count' => $billableLines,
            'knives_registered_count' => $knivesReg,
            'price_per_knife_pence' => $order->price_per_knife_pence,
            'discount_pence' => $order->discount_pence,
            'subtotal_pence' => $order->subtotal_pence,
            'tax_pence' => $order->tax_pence,
            'total_pence' => $order->total_pence,
            'total_amount_minor' => (int) $order->total_pence,
            'formatted_amount' => MoneyFormatting::formatGbpFromPence((int) $order->total_pence),
            'currency' => $order->currency,
            'payment_status' => $order->payment_status?->value,
            'company' => $order->relationLoaded('company') && $order->company !== null ? [
                'name' => $order->company->name,
                'city' => $order->company->city,
            ] : null,
            'booking' => $order->relationLoaded('booking') && $order->booking !== null
                ? [
                    'id' => (string) $order->booking->id,
                    'reference' => BookingResource::reference($order->booking),
                    'scheduled_date' => $order->booking->scheduled_date?->format('Y-m-d'),
                    'status' => $order->booking->booking_status?->value,
                ]
                : null,
            'scheduled_date' => $order->booking?->scheduled_date?->format('Y-m-d'),
            'route_name' => $order->operationalRoute?->name,
            'updated_at' => $order->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(Order $order): array
    {
        /** @var Collection<int, AuditLog> $audits */
        $audits = AuditLog::query()
            ->with('actor:id,name,email')
            ->where('auditable_type', Order::class)
            ->where('auditable_id', $order->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $payload = array_merge(self::listRow($order), [
            'knives' => $order->relationLoaded('knives')
                ? $order->knives->map(fn (Knife $k) => KnifeJson::summary($k))->values()->all()
                : [],
            'items' => $order->relationLoaded('items')
                ? $order->items->map(function (OrderItem $i): array {
                    $qty = (int) $i->quantity;
                    $unit = (int) $i->unit_amount_pence;
                    $line = $qty * $unit;

                    return [
                        'id' => (string) $i->id,
                        'knife_id' => $i->knife_id !== null ? (string) $i->knife_id : null,
                        'description' => $i->description,
                        'quantity' => $qty,
                        'unit_amount_pence' => $unit,
                        'line_total_pence' => $line,
                        'formatted_unit_amount' => MoneyFormatting::formatGbpFromPence($unit),
                        'formatted_line_total' => MoneyFormatting::formatGbpFromPence($line),
                    ];
                })->values()->all()
                : [],
        ]);

        $payload['created_at'] = $order->created_at?->toIso8601String();
        $payload['completed_at'] = $order->completed_at?->toIso8601String();
        $payload['booking_detail'] = self::bookingAdminEmbed($order);

        $payload['audit_timeline'] = AuditLogPresenter::mapTimeline($audits, includeIp: true);
        $payload['status_timeline'] = self::statusTimeline($order, $audits);

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
