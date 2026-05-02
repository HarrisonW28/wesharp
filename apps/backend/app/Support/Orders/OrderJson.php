<?php

namespace App\Support\Orders;

use App\Enums\EvidencePhotoVisibility;
use App\Enums\KnifeStatus;
use App\Enums\OrderStatus;
use App\Http\Resources\BookingResource;
use App\Models\AuditLog;
use App\Models\CustomerPortalUpdate;
use App\Models\DamageReport;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\Pricing\PricingRuleResolver;
use App\Support\Audit\AuditLogPresenter;
use App\Support\Evidence\EvidencePhotoJson;
use App\Support\Knives\KnifeJson;
use App\Support\Knives\KnifeStatusPresentation;
use App\Support\Money\MoneyFormatting;
use App\Support\Portal\PortalCustomerUpdateJson;
use App\Support\Portal\PortalFulfilmentPresenter;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

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
            'status_label' => OrderStatusPresentation::customerLabel($order->order_status),
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
            'is_complimentary' => (bool) $order->is_complimentary,
            'estimated_knife_count' => $order->relationLoaded('booking') ? $order->booking?->estimated_knife_count : null,
            'actual_knife_count' => $order->relationLoaded('booking') ? $order->booking?->actual_knife_count : null,
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
                $eff = self::orderItemEffectiveStatus($i);
                $labelStatus = $eff ?? ($i->knife_id === null ? KnifeStatus::Logged : null);

                $bk = $i->subscription_billing_kind?->value;

                return [
                    'description' => $i->description,
                    'quantity' => $qty,
                    'unit_amount_pence' => $unit,
                    'line_total_pence' => $line,
                    'formatted_unit_amount' => MoneyFormatting::formatGbpFromPence($unit),
                    'formatted_line_total' => MoneyFormatting::formatGbpFromPence($line),
                    'status' => $labelStatus?->value,
                    'status_label' => KnifeStatusPresentation::customerLabel($labelStatus),
                    'subscription_billing_kind' => $bk,
                    'subscription_billing_note' => match ($bk) {
                        'included' => 'Included in your subscription allowance for this period.',
                        'overage' => 'This line may be billed as subscription overage — see your invoice.',
                        default => null,
                    },
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

        if (config('wesharp_evidence.show_in_customer_portal', true)) {
            if (! $order->relationLoaded('evidencePhotos')) {
                $order->load([
                    'evidencePhotos' => fn ($q) => $q
                        ->where('visibility', EvidencePhotoVisibility::CustomerVisible->value)
                        ->whereNull('archived_at')
                        ->orderByDesc('captured_at'),
                ]);
            }
            $payload['photos'] = $order->evidencePhotos
                ->filter(
                    static fn ($p) => $p->visibility === EvidencePhotoVisibility::CustomerVisible
                        && $p->archived_at === null
                )
                ->map(static fn ($p): array => EvidencePhotoJson::portalRow($p, $order))
                ->values()
                ->all();
        } else {
            $payload['photos'] = [];
        }

        $payload['fulfilment'] = PortalFulfilmentPresenter::forOrder($order);
        $payload['workshop_progress'] = self::workshopProgress($order);

        $payload['subscription_coverage'] = is_array($order->subscription_coverage)
            ? [
                'mode' => $order->subscription_coverage['mode'] ?? null,
                'included_summary' => $order->subscription_coverage['included_summary'] ?? null,
                'collections_overage_for_order' => (int) ($order->subscription_coverage['collections_overage_for_order'] ?? 0),
                'knives_overage_for_order' => (int) ($order->subscription_coverage['knives_overage_for_order'] ?? 0),
            ]
            : null;

        if (config('wesharp_evidence.show_in_customer_portal', true)) {
            $payload['customer_messages'] = CustomerPortalUpdate::query()
                ->where('company_id', $order->company_id)
                ->where(function ($q) use ($order): void {
                    $q->where('order_id', $order->id);
                    if ($order->booking_id !== null) {
                        $q->orWhere('booking_id', $order->booking_id);
                    }
                })
                ->active()
                ->where('visibility', EvidencePhotoVisibility::CustomerVisible->value)
                ->orderBy('created_at')
                ->get()
                ->map(static fn (CustomerPortalUpdate $u): array => PortalCustomerUpdateJson::portalRow($u))
                ->values()
                ->all();
        } else {
            $payload['customer_messages'] = [];
        }

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
                    'line_item_type' => $item->line_item_type?->value,
                    'line_item_type_label' => $item->line_item_type !== null
                        ? Str::headline(str_replace('_', ' ', $item->line_item_type->value))
                        : null,
                ];
            })->values()->all();
        }

        return $out;
    }

    /**
     * @param  Collection<int, AuditLog>  $auditRows  Newest-first audit rows for this order.
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

        $events = $auditRows
            ->filter(static fn (AuditLog $r): bool => in_array($r->action, [
                'order.status_changed',
                'order.activated',
                'order.completed',
                'order.cancelled',
            ], true))
            ->sortBy(static fn (AuditLog $r) => $r->created_at?->timestamp ?? 0)
            ->values();

        foreach ($events as $log) {
            /** @var array<string, mixed> $payload */
            $payload = is_array($log->payload) ? $log->payload : [];

            if ($log->action === 'order.status_changed') {
                $to = isset($payload['to']) && is_string($payload['to']) ? $payload['to'] : '';
                if ($to === '') {
                    continue;
                }
                try {
                    $toEnum = OrderStatus::from($to);
                } catch (\ValueError) {
                    continue;
                }
                $milestones[] = [
                    'key' => 'status_'.$to,
                    'label' => OrderStatusPresentation::adminLabel($toEnum),
                    'at' => $log->created_at?->toIso8601String(),
                ];
            } elseif ($log->action === 'order.activated') {
                $milestones[] = [
                    'key' => 'legacy_activated',
                    'label' => 'Marked active (legacy)',
                    'at' => $log->created_at?->toIso8601String(),
                ];
            } elseif ($log->action === 'order.completed') {
                $milestones[] = [
                    'key' => 'completed',
                    'label' => 'Completed',
                    'at' => $log->created_at?->toIso8601String(),
                ];
            } elseif ($log->action === 'order.cancelled') {
                $milestones[] = [
                    'key' => 'cancelled',
                    'label' => 'Cancelled',
                    'at' => $log->created_at?->toIso8601String(),
                ];
            }
        }

        $hasCompletedAudit = $auditRows->contains(static fn (AuditLog $r) => $r->action === 'order.completed');
        if (! $hasCompletedAudit && $order->completed_at !== null && $order->order_status === OrderStatus::Completed) {
            $milestones[] = [
                'key' => 'completed',
                'label' => 'Completed',
                'at' => $order->completed_at->toIso8601String(),
            ];
        }

        return $milestones;
    }

    /**
     * @return list<array{value: string, label: string, risky: bool}>
     */
    public static function allowedNextStatusesForDetail(Order $order): array
    {
        $order->loadMissing(['items', 'knives']);

        $next = OrderStatusTransitions::nextStatuses($order->order_status);
        $out = [];

        foreach ($next as $status) {
            if ($status === OrderStatus::Completed && $order->items->isEmpty() && $order->knives->isEmpty()) {
                continue;
            }

            $out[] = [
                'value' => $status->value,
                'label' => OrderStatusPresentation::adminLabel($status),
                'risky' => in_array($status, [
                    OrderStatus::Cancelled,
                    OrderStatus::Completed,
                    OrderStatus::Invoiced,
                    OrderStatus::Returned,
                ], true),
            ];
        }

        return $out;
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
            'service_type' => $b->service_type?->value,
            'estimated_knife_count' => $b->estimated_knife_count,
            'actual_knife_count' => $b->actual_knife_count,
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
            'status_label' => OrderStatusPresentation::adminLabel($order->order_status),
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
            'order_damage_reports' => self::adminOrderDamageReports($order),
            'knives' => $order->relationLoaded('knives')
                ? $order->knives->map(fn (Knife $k) => KnifeJson::summary($k))->values()->all()
                : [],
            'items' => $order->relationLoaded('items')
                ? $order->items->map(function (OrderItem $i): array {
                    $qty = (int) $i->quantity;
                    $unit = (int) $i->unit_amount_pence;
                    $line = $qty * $unit;
                    $eff = self::orderItemEffectiveStatus($i);

                    return [
                        'id' => (string) $i->id,
                        'knife_id' => $i->knife_id !== null ? (string) $i->knife_id : null,
                        'description' => $i->description,
                        'quantity' => $qty,
                        'unit_amount_pence' => $unit,
                        'line_total_pence' => $line,
                        'formatted_unit_amount' => MoneyFormatting::formatGbpFromPence($unit),
                        'formatted_line_total' => MoneyFormatting::formatGbpFromPence($line),
                        'service_status' => $i->service_status?->value,
                        'effective_status' => $eff?->value,
                        'status_label' => KnifeStatusPresentation::adminLabel($eff),
                        'subscription_billing_kind' => $i->subscription_billing_kind?->value,
                        'subscription_billing_kind_label' => $i->subscription_billing_kind !== null
                            ? Str::headline($i->subscription_billing_kind->value)
                            : null,
                        'allowed_next_service_statuses' => $i->knife_id === null
                            ? KnifeJson::allowedNextFromKnifeStatus($i->service_status ?? KnifeStatus::Logged)
                            : [],
                    ];
                })->values()->all()
                : [],
        ]);

        $payload['created_at'] = $order->created_at?->toIso8601String();
        $payload['completed_at'] = $order->completed_at?->toIso8601String();
        $payload['booking_detail'] = self::bookingAdminEmbed($order);

        $payload['audit_timeline'] = AuditLogPresenter::mapTimeline($audits, includeIp: true);
        $payload['status_timeline'] = self::statusTimeline($order, $audits);
        $payload['allowed_next_statuses'] = self::allowedNextStatusesForDetail($order);
        $payload['workshop_progress'] = self::workshopProgress($order);

        $activeInvoice = null;
        if ($order->relationLoaded('invoices')) {
            /** @phpstan-ignore-next-line */
            $activeInvoice = $order->invoices->first();
        }
        $payload['invoice'] = $activeInvoice instanceof Invoice
            ? self::invoiceEmbed($activeInvoice)
            : null;

        if ($order->relationLoaded('evidencePhotos')) {
            $payload['evidence_photos'] = $order->evidencePhotos
                ->filter(static fn ($p) => $p->archived_at === null)
                ->map(static fn ($p): array => EvidencePhotoJson::adminRow($p))
                ->values()
                ->all();
        } else {
            $payload['evidence_photos'] = [];
        }

        $payload['evidence_settings'] = self::adminEvidenceSettings();

        $payload['company_subscription_id'] = $order->company_subscription_id !== null
            ? (string) $order->company_subscription_id
            : null;
        $payload['subscription_coverage'] = $order->subscription_coverage;
        $payload['subscription_coverage_computed_at'] = $order->subscription_coverage_computed_at?->toIso8601String();
        $payload['subscription_coverage_overridden'] = (bool) $order->subscription_coverage_overridden;
        $payload['subscription_coverage_override_reason'] = $order->subscription_coverage_override_reason;

        $resolver = app(PricingRuleResolver::class);
        $order->loadMissing(['booking', 'company', 'company.locations']);
        $matched = $resolver->resolveForOrder($order);
        $payload['pricing_hint'] = [
            'default_unit_amount_pence' => $resolver->defaultUnitAmountPenceForOrder($order),
            'matched_rule' => $matched !== null ? [
                'id' => (string) $matched->id,
                'name' => $matched->name,
                'rule_kind' => $matched->rule_kind,
                'priority' => (int) $matched->priority,
            ] : null,
        ];
        $payload['is_complimentary'] = (bool) $order->is_complimentary;
        $payload['manual_charge_subtotal_pence'] = $order->manual_charge_subtotal_pence !== null
            ? (int) $order->manual_charge_subtotal_pence
            : null;
        $payload['manual_charge_reason'] = $order->manual_charge_reason;

        return $payload;
    }

    /** Evidence / workshop policy flags for admin UIs (orders, knives, route stops). */
    /** @return array<string, mixed> */
    public static function adminEvidenceSettings(): array
    {
        return [
            'require_collection_photo' => (bool) config('wesharp_evidence.require_collection_photo', false),
            'require_return_photo' => (bool) config('wesharp_evidence.require_return_photo', false),
            'require_failed_collection_photo' => (bool) config('wesharp_evidence.require_failed_collection_photo', false),
            'require_damage_photo_when_damage_report' => (bool) config('wesharp_evidence.require_damage_photo_when_damage_report', false),
            'require_completion_photo' => (bool) config('wesharp_evidence.require_completion_photo', false),
            'default_visibility' => (string) config('wesharp_evidence.default_visibility', 'internal_only'),
            'allow_customer_visible_photos' => (bool) config('wesharp_evidence.allow_customer_visible_photos', true),
            'allow_customer_visible_workshop_photos' => (bool) config('wesharp_evidence.allow_customer_visible_photos', true),
            'show_in_customer_portal' => (bool) config('wesharp_evidence.show_in_customer_portal', true),
        ];
    }

    private static function orderItemEffectiveStatus(OrderItem $i): ?KnifeStatus
    {
        if ($i->knife_id !== null && $i->relationLoaded('knife') && $i->knife !== null) {
            return $i->knife->knife_status;
        }

        return $i->service_status;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function adminOrderDamageReports(Order $order): array
    {
        if (! $order->relationLoaded('knives')) {
            return [];
        }

        $ids = $order->knives->pluck('id')->all();
        if ($ids === []) {
            return [];
        }

        return DamageReport::query()
            ->whereIn('knife_id', $ids)
            ->with(['knife:id,label,tag_id', 'reportedBy:id,name'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function (DamageReport $d): array {
                $row = KnifeJson::adminDamageReportRow($d);

                return array_merge($row, [
                    'knife_label' => $d->knife?->label,
                    'knife_tag_id' => $d->knife?->tag_id,
                ]);
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public static function workshopProgress(Order $order): array
    {
        $order->loadMissing(['knives', 'items.knife']);

        $byStatus = [];
        $knifeTerminal = 0;

        foreach ($order->knives as $k) {
            $v = $k->knife_status->value;
            $byStatus[$v] = ($byStatus[$v] ?? 0) + 1;
            if (in_array($k->knife_status, [KnifeStatus::Returned, KnifeStatus::Cancelled], true)) {
                $knifeTerminal++;
            }
        }

        $lineOnlyUnits = 0;
        foreach ($order->items as $item) {
            if ($item->knife_id !== null) {
                continue;
            }
            $qty = (int) $item->quantity;
            $lineOnlyUnits += $qty;
            $st = $item->service_status ?? KnifeStatus::Logged;
            $v = $st->value;
            $byStatus[$v] = ($byStatus[$v] ?? 0) + $qty;
        }

        $knifeCount = $order->knives->count();

        return [
            'knife_count' => $knifeCount,
            'line_only_units' => $lineOnlyUnits,
            'work_units' => $knifeCount + $lineOnlyUnits,
            'by_status' => $byStatus,
            'knives_returned_or_cancelled' => $knifeTerminal,
            'all_knives_complete' => $knifeCount === 0 || $knifeTerminal >= $knifeCount,
        ];
    }
}
