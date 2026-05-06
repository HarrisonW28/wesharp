<?php

namespace App\Services\Orders;

use App\Actions\Orders\CompleteOrderAction;
use App\Enums\InvoiceStatus;
use App\Enums\KnifeServiceKind;
use App\Enums\OrderStatus;
use App\Enums\SubscriptionOrderItemBillingKind;
use App\Models\Knife;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\Audit\AuditRecorder;
use App\Services\Knives\KnifeService;
use App\Services\Knives\KnifeServiceAssignmentRecorder;
use App\Services\Notifications\OrderEmailService;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class OrderService
{
    public function __construct(
        private KnifeService $knifeService,
        private CompleteOrderAction $completeOrderAction,
        private KnifeServiceAssignmentRecorder $knifeAssignmentRecorder,
        private OrderEmailService $orderEmails,
    ) {}

    public function paginate(Request $request, bool $withOperationalRoute = true): LengthAwarePaginator
    {
        $perPage = min(75, max(1, (int) $request->query('per_page', 20)));

        $with = [
            'company:id,name,city,deleted_at',
            'booking:id,scheduled_date,booking_status,estimated_knife_count,actual_knife_count,service_type',
        ];
        if ($withOperationalRoute) {
            $with[] = 'operationalRoute:id,name,route_status,scheduled_date';
        }

        $query = Order::query()
            ->with($with)
            ->withCount([
                'items as billable_lines_count',
                'knives as knives_registered_count',
            ])
            ->orderByDesc('created_at');

        if (($v = trim((string) $request->query('q', ''))) !== '') {
            $needle = '%'.$v.'%';
            $query->where(function ($q) use ($v, $needle): void {
                $q->where('id', $v)
                    ->orWhereHas('knives', fn ($k) => $k->where('tag_id', 'like', $needle))
                    ->orWhereHas('knives', fn ($k) => $k->where('label', 'like', $needle))
                    ->orWhereHas('company', fn ($c) => $c->withTrashed()->where('name', 'like', $needle));
            });
        }

        if (($s = trim((string) $request->query('status', ''))) !== '') {
            $query->where('order_status', $s);
        }

        if (($p = trim((string) $request->query('payment_status', ''))) !== '') {
            $query->where('payment_status', $p);
        }

        if (($cid = trim((string) $request->query('company_id', ''))) !== '') {
            $query->where('company_id', $cid);
        }

        if (($from = trim((string) $request->query('date_from', ''))) !== '') {
            $query->whereDate('created_at', '>=', $from);
        }

        if (($to = trim((string) $request->query('date_to', ''))) !== '') {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($request->query('needs_knives') === '1' || $request->query('needs_knives') === 'true') {
            $query->whereIn('order_status', [
                OrderStatus::Received->value,
                OrderStatus::Inspection->value,
                OrderStatus::InProgress->value,
                OrderStatus::QualityCheck->value,
            ])->whereDoesntHave('knives');
        }

        if ($request->query('needs_workshop_photos') === '1' || $request->query('needs_workshop_photos') === 'true') {
            $query->whereIn('order_status', [
                OrderStatus::Inspection->value,
                OrderStatus::InProgress->value,
                OrderStatus::QualityCheck->value,
            ])->whereDoesntHave('evidencePhotos', fn ($q) => $q->whereNull('archived_at'));
        }

        $invFilter = trim((string) $request->query('invoice_status', ''));
        if ($invFilter === 'none') {
            $query->whereDoesntHave('invoices', fn ($q) => $q->where('invoice_status', '!=', InvoiceStatus::Void->value));
        } elseif ($invFilter !== '') {
            $query->whereHas(
                'invoices',
                fn ($q) => $q
                    ->where('invoice_status', $invFilter)
                    ->where('invoice_status', '!=', InvoiceStatus::Void->value)
            );
        }

        /** @phpstan-ignore-next-line */
        return $query->paginate($perPage)->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data  Validated + cast by FormRequest / controller.
     */
    public function create(array $data, Authenticatable $actor, Request $request): Order
    {
        $order = DB::transaction(function () use ($data, $actor, $request): Order {
            $model = Order::query()->create($data);

            AuditRecorder::record($actor, $model, 'order.created', [
                'company_id' => (string) $model->company_id,
                'booking_id' => $model->booking_id !== null ? (string) $model->booking_id : null,
            ], $request);

            return $this->rebuildMonetaryTotals($model->fresh(['knives', 'items']));
        });

        $this->orderEmails->sendOrderCreated($order);

        /** @phpstan-ignore-next-line */
        return $order->loadMissing([
            'company:id,name,city',
            'booking:id,scheduled_date',
            'operationalRoute:id,name,route_status,scheduled_date',
            'knives' => fn ($q) => $q->latest()->limit(100),
        ]);
    }

    /**
     * @param  array<string, mixed>  $patch
     */
    public function update(Order $order, array $patch, Authenticatable $actor, Request $request): Order
    {
        return DB::transaction(function () use ($order, $patch, $actor, $request): Order {
            unset($patch['order_status']);

            $pricingKeys = ['is_complimentary', 'manual_charge_subtotal_pence', 'manual_charge_reason'];
            /** @phpstan-ignore-next-line */
            $beforePricing = $order->only($pricingKeys);

            /** @phpstan-ignore-next-line */
            $keys = array_keys($patch);
            /** @phpstan-ignore-next-line */
            $before = $order->only($keys);

            $order->fill($patch);
            $order->save();

            AuditRecorder::record($actor, $order, 'order.updated', [
                'before' => $before,
                'after' => $order->only($keys),
            ], $request);

            if (array_intersect($keys, $pricingKeys) !== []) {
                AuditRecorder::record($actor, $order, 'order.pricing_terms_updated', [
                    'before' => $beforePricing,
                    'after' => $order->only($pricingKeys),
                ], $request);
            }

            return $this->rebuildMonetaryTotals($order->fresh(['knives', 'items']));
        });
    }

    public function rebuildMonetaryTotals(Order $order): Order
    {
        $order->loadMissing(['knives', 'items', 'booking']);

        $rows = $order->knives->count();
        $planned = max(0, (int) ($order->knife_count ?? 0));
        /** Effective units for VAT line (planned batch size × actual whichever higher). */
        $n = max($rows, $planned);

        $order->knife_count = $rows > 0 ? $rows : $planned;

        if ($order->is_complimentary) {
            $order->subtotal_pence = 0;
            $order->tax_pence = 0;
            $order->total_pence = 0;
            $order->save();

            return $order->fresh();
        }

        $manual = $order->manual_charge_subtotal_pence;
        $manualReason = $order->manual_charge_reason !== null ? trim((string) $order->manual_charge_reason) : '';
        if ($manual !== null && $manualReason !== '') {
            $netBeforeVat = max(0, (int) $manual - (int) $order->discount_pence);
            $tax = (int) round($netBeforeVat * 0.20);

            $order->subtotal_pence = $netBeforeVat;
            $order->tax_pence = $tax;
            $order->total_pence = $netBeforeVat + $tax;
            $order->save();

            return $order->fresh();
        }

        if ($order->items->isNotEmpty()) {
            $lineNet = $this->sumOrderItemsNetPence($order);
            $netBeforeVat = max(0, $lineNet - (int) $order->discount_pence);
            $tax = (int) round($netBeforeVat * 0.20);

            $order->subtotal_pence = $netBeforeVat;
            $order->tax_pence = $tax;
            $order->total_pence = $netBeforeVat + $tax;
            $order->save();

            return $order->fresh();
        }

        $ppp = $order->price_per_knife_pence;
        if ($ppp === null || $n < 1) {
            $order->save();

            return $order->fresh();
        }

        $netBeforeVat = max(0, (int) (($ppp * $n) - (int) $order->discount_pence));
        $tax = (int) round($netBeforeVat * 0.20);

        $order->subtotal_pence = $netBeforeVat;
        $order->tax_pence = $tax;
        $order->total_pence = $netBeforeVat + $tax;
        $order->save();

        return $order->fresh();
    }

    private function sumOrderItemsNetPence(Order $order): int
    {
        $cov = $order->subscription_coverage;
        $subMode = is_array($cov)
            && ($cov['mode'] ?? '') === 'subscription'
            && $order->order_status === OrderStatus::Completed;
        $ovRate = $subMode ? (int) ($cov['overage_unit_price_pence'] ?? 0) : 0;

        $sum = 0;
        foreach ($order->items as $i) {
            $qty = max(1, (int) $i->quantity);
            if ($subMode) {
                $kind = $i->subscription_billing_kind;
                if ($kind === SubscriptionOrderItemBillingKind::Included) {
                    continue;
                }
                if ($kind === SubscriptionOrderItemBillingKind::Overage) {
                    $sum += $ovRate * $qty;

                    continue;
                }
            }
            $sum += (int) $i->unit_amount_pence * $qty;
        }

        return $sum;
    }

    /** @param  array<string, mixed>  $knifePayload */
    public function addKnife(Order $order, array $knifePayload, Authenticatable $actor, Request $request): Knife
    {
        return DB::transaction(function () use ($order, $knifePayload, $actor, $request): Knife {
            $knife = $this->knifeService->createForOrder($order, $knifePayload);

            AuditRecorder::record($actor, $knife, 'knife.created_via_order', [
                'tag_id' => $knife->tag_id,
                'order_id' => (string) $order->id,
            ], $request);

            $this->rebuildMonetaryTotals($order->fresh(['knives', 'items']));

            /** @phpstan-ignore-next-line */
            return $knife->fresh([
                'sharpenedBy:id,name',
                'qualityCheckedBy:id,name',
                'returnedBy:id,name',
            ]);
        });
    }

    /**
     * Multi-line intake: link inventory blades and/or register new workshop knives, with a billable line per blade.
     *
     * @param  array{items: list<array<string, mixed>>}  $validated
     */
    public function bulkAddOrderItems(Order $order, array $validated, Authenticatable $actor, Request $request): Order
    {
        return DB::transaction(function () use ($order, $validated, $actor, $request): Order {
            /** @var list<array<string, mixed>> $items */
            $items = $validated['items'];
            $orderItemIds = [];

            foreach ($items as $row) {
                $qty = (int) $row['quantity'];
                $unitPence = (int) $row['unit_amount_pence'];
                $notes = isset($row['notes']) ? trim((string) $row['notes']) : '';

                /** @phpstan-ignore-next-line */
                $knifeId = $row['knife_id'] ?? null;
                if ($knifeId !== null && $knifeId !== '') {
                    /** @phpstan-ignore-next-line */
                    $knife = $this->attachKnifeFromInventory($order, (string) $knifeId, $actor, $request);
                    /** @phpstan-ignore-next-line */
                    $line = OrderItem::query()->create([
                        'order_id' => $order->id,
                        'knife_id' => $knife->id,
                        'description' => self::orderItemDescriptionFromKnife($knife, $notes),
                        'quantity' => 1,
                        'unit_amount_pence' => $unitPence,
                    ]);
                    $orderItemIds[] = (string) $line->id;

                    continue;
                }

                $type = isset($row['knife_type']) ? trim((string) $row['knife_type']) : '';
                $label = isset($row['label']) ? trim((string) $row['label']) : '';
                $brand = isset($row['brand']) ? trim((string) $row['brand']) : '';
                $condition = isset($row['condition_before']) ? trim((string) $row['condition_before']) : '';
                $labelBase = $label !== '' ? $label : ($type !== '' ? $type : 'Knife');

                /** @phpstan-ignore-next-line */
                $workingOrder = $order->fresh(['booking', 'company']);

                foreach (range(1, $qty) as $i) {
                    /** @phpstan-ignore-next-line */
                    $baseCount = Knife::query()->where('order_id', $order->id)->count();
                    $knifeLabel = $qty > 1 ? "{$labelBase} ({$i}/{$qty})" : $labelBase;

                    /** @phpstan-ignore-next-line */
                    $knife = $this->knifeService->createForOrder($workingOrder, [
                        'knife_type' => $type !== '' ? $type : null,
                        'brand' => $brand !== '' ? $brand : null,
                        'label' => $knifeLabel,
                        'description' => $knifeLabel,
                        'notes' => $notes !== '' ? $notes : null,
                        'condition_before' => $condition !== '' ? $condition : null,
                        'position' => $baseCount + 1,
                    ]);

                    AuditRecorder::record($actor, $knife, 'knife.created_via_order', [
                        'tag_id' => $knife->tag_id,
                        'order_id' => (string) $order->id,
                    ], $request);

                    $desc = $notes !== '' ? "{$knifeLabel} — {$notes}" : $knifeLabel;

                    /** @phpstan-ignore-next-line */
                    $line = OrderItem::query()->create([
                        'order_id' => $order->id,
                        'knife_id' => $knife->id,
                        'description' => $desc,
                        'quantity' => 1,
                        'unit_amount_pence' => $unitPence,
                    ]);
                    $orderItemIds[] = (string) $line->id;
                }
            }

            AuditRecorder::record($actor, $order, 'order.bulk_order_items_added', [
                'order_item_ids' => $orderItemIds,
            ], $request);

            /** @phpstan-ignore-next-line */
            return $this->rebuildMonetaryTotals($order->fresh(['knives', 'items']));
        });
    }

    private static function orderItemDescriptionFromKnife(Knife $knife, string $notes): string
    {
        $chunks = [];
        foreach ([$knife->label, $knife->knife_type, $knife->tag_id] as $p) {
            if (is_string($p) && $p !== '') {
                $chunks[] = $p;
            }
        }
        $base = $chunks !== [] ? implode(' · ', $chunks) : 'Knife';

        return $notes !== '' ? "{$base} — {$notes}" : $base;
    }

    /** @param  array{count: int, knife_type?: ?string, condition_before?: ?string, description_prefix?: ?string}  $bulk */
    public function bulkAddKnives(Order $order, array $bulk, Authenticatable $actor, Request $request): array
    {
        return DB::transaction(function () use ($order, $bulk, $actor, $request): array {
            $target = max(1, min(500, $bulk['count']));
            $knifeIds = [];

            if (isset($bulk['price_per_knife_pence']) && $bulk['price_per_knife_pence'] !== null && $bulk['price_per_knife_pence'] !== '') {
                $ppp = max(0, (int) $bulk['price_per_knife_pence']);
                $order->price_per_knife_pence = $ppp;
                $order->save();
                AuditRecorder::record($actor, $order, 'order.bulk_price_set', ['price_per_knife_pence' => $ppp], $request);
            }

            $base = $order->knives()->count();
            /** @phpstan-ignore-next-line */
            $sharedNotes = isset($bulk['notes']) ? trim((string) $bulk['notes']) : '';
            /** @phpstan-ignore-next-line */
            $typeOrName = trim((string) ($bulk['type_or_name'] ?? $bulk['knife_type'] ?? ''));

            foreach (range(1, $target) as $i) {
                $descPrefix = isset($bulk['description_prefix'])
                    ? trim((string) $bulk['description_prefix'])
                    : '';

                $label = $typeOrName !== '' ? "{$typeOrName} ({$i}/{$target})" : 'Knife '.$i;

                $descPieces = [$descPrefix !== '' ? $descPrefix.' '.$i : $label];
                if ($sharedNotes !== '') {
                    $descPieces[] = $sharedNotes;
                }

                /** @phpstan-ignore-next-line */
                $knife = $this->knifeService->createForOrder($order->fresh(), [
                    /** @phpstan-ignore-next-line */
                    'knife_type' => ($bulk['knife_type'] ?? ($typeOrName !== '' ? $typeOrName : null)),
                    'condition_before' => $bulk['condition_before'] ?? null,
                    'description' => implode(' · ', array_filter($descPieces)),
                    'notes' => $sharedNotes !== '' ? $sharedNotes : null,
                    'position' => $base + $i,
                ]);

                $knifeIds[] = (string) $knife->id;

                AuditRecorder::record($actor, $knife, 'knife.bulk_registered', ['tag_id' => $knife->tag_id], $request);
            }

            AuditRecorder::record($actor, $order, 'order.bulk_knives_registered', [
                'knife_ids' => $knifeIds,
            ], $request);

            $fresh = $this->rebuildMonetaryTotals($order->fresh(['knives', 'items']));

            /** @phpstan-ignore-next-line */
            return ['order' => $fresh->loadMissing(['knives']), 'knife_ids' => $knifeIds];
        });
    }

    /**
     * Link an on-file knife to this order. If the knife is on a closed order, service history is preserved
     * and a new assignment row opens; active orders block re-attachment.
     */
    public function attachKnifeFromInventory(Order $order, string $knifeId, Authenticatable $actor, Request $request): Knife
    {
        return DB::transaction(function () use ($order, $knifeId, $actor, $request): Knife {
            /** @phpstan-ignore-next-line */
            $knife = Knife::query()->findOrFail($knifeId);

            /** @phpstan-ignore-next-line */
            if ((string) $knife->company_id !== (string) $order->company_id) {
                abort(422, 'This knife belongs to a different customer company.');
            }

            $priorOrderId = $knife->order_id;
            $kind = KnifeServiceKind::InventoryLink;

            if ($priorOrderId !== null) {
                /** @phpstan-ignore-next-line */
                $priorOrder = Order::query()->find($priorOrderId);
                if ($priorOrder === null) {
                    $this->knifeAssignmentRecorder->closeOpenForKnife($knife);
                } elseif (! $priorOrder->isEligibleForKnifeReservice()) {
                    abort(422, 'This knife is still linked to an active order. Complete, invoice, return, or cancel that order before attaching it here.');
                } else {
                    $kind = KnifeServiceKind::Reservice;
                    $this->knifeAssignmentRecorder->closeOpenForKnife($knife);
                }
            }

            $before = [
                'order_id' => $priorOrderId !== null ? (string) $priorOrderId : null,
                'booking_id' => $knife->booking_id,
            ];

            /** @phpstan-ignore-next-line */
            $knife->order_id = $order->id;
            /** @phpstan-ignore-next-line */
            $knife->booking_id = $order->booking_id;
            /** @phpstan-ignore-next-line */
            $knife->save();

            $this->knifeAssignmentRecorder->openForOrder($knife->fresh(), $order, $kind);

            AuditRecorder::record($actor, $knife, 'knife.attached_to_order', [
                'before' => $before,
                'after' => [
                    /** @phpstan-ignore-next-line */
                    'order_id' => (string) $knife->order_id,
                    /** @phpstan-ignore-next-line */
                    'booking_id' => $knife->booking_id !== null ? (string) $knife->booking_id : null,
                ],
                /** @phpstan-ignore-next-line */
                'prior_order_id' => $priorOrderId !== null ? (string) $priorOrderId : null,
                'service_kind' => $kind->value,
                /** @phpstan-ignore-next-line */
                'tag_id' => $knife->tag_id,
            ], $request);

            $this->rebuildMonetaryTotals($order->fresh(['knives', 'items']));

            /** @phpstan-ignore-next-line */
            return $knife->fresh([
                'sharpenedBy:id,name',
                'qualityCheckedBy:id,name',
                'returnedBy:id,name',
            ]);
        });
    }

    public function complete(Order $order, Authenticatable $actor, Request $request): Order
    {
        /** @phpstan-ignore-next-line */
        return $this->completeOrderAction->execute($order->fresh(['items', 'knives']), $actor, $request)
            ->load([
                'company:id,name,city',
                'booking:id,scheduled_date',
                /** @phpstan-ignore-next-line */
                'knives' => fn ($q) => $q->latest()->limit(250),
                'operationalRoute:id,name',
            ]);
    }
}
