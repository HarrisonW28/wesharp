<?php

namespace App\Services\Orders;

use App\Actions\Orders\CompleteOrderAction;
use App\Models\Knife;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use App\Services\Knives\KnifeService;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class OrderService
{
    public function __construct(
        private KnifeService $knifeService,
        private CompleteOrderAction $completeOrderAction,
    ) {}

    public function paginate(Request $request): LengthAwarePaginator
    {
        $perPage = min(75, max(1, (int) $request->query('per_page', 20)));

        $query = Order::query()
            ->with([
                'company:id,name,city',
                'booking:id,scheduled_date',
                'operationalRoute:id,name,route_status,scheduled_date',
            ])
            ->orderByDesc('created_at');

        if (($v = trim((string) $request->query('q', ''))) !== '') {
            $query->where(function ($q) use ($v): void {
                $q->where('id', $v)
                    ->orWhereHas('knives', fn ($k) => $k->where('tag_id', 'like', '%'.$v.'%'));
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

            return $this->rebuildMonetaryTotals($model->fresh(['knives']));
        });

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

            return $this->rebuildMonetaryTotals($order->fresh(['knives']));
        });
    }

    public function rebuildMonetaryTotals(Order $order): Order
    {
        $rows = $order->knives()->count();
        $planned = max(0, (int) ($order->knife_count ?? 0));
        /** Effective units for VAT line (planned batch size × actual whichever higher). */
        $n = max($rows, $planned);

        $order->knife_count = $rows > 0 ? $rows : $planned;

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

    /** @param  array<string, mixed>  $knifePayload */
    public function addKnife(Order $order, array $knifePayload, Authenticatable $actor, Request $request): Knife
    {
        return DB::transaction(function () use ($order, $knifePayload, $actor, $request): Knife {
            $knife = $this->knifeService->createForOrder($order, $knifePayload);

            AuditRecorder::record($actor, $knife, 'knife.created_via_order', [
                'tag_id' => $knife->tag_id,
                'order_id' => (string) $order->id,
            ], $request);

            $this->rebuildMonetaryTotals($order->fresh(['knives']));

            /** @phpstan-ignore-next-line */
            return $knife->fresh([
                'sharpenedBy:id,name',
                'qualityCheckedBy:id,name',
                'returnedBy:id,name',
            ]);
        });
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

            $fresh = $this->rebuildMonetaryTotals($order->fresh(['knives']));

            /** @phpstan-ignore-next-line */
            return ['order' => $fresh->loadMissing(['knives']), 'knife_ids' => $knifeIds];
        });
    }

    /** Link an unassigned workshop knife inventory row to this order without mutating historic orders. */
    public function attachKnifeFromInventory(Order $order, string $knifeId, Authenticatable $actor, Request $request): Knife
    {
        return DB::transaction(function () use ($order, $knifeId, $actor, $request): Knife {
            /** @phpstan-ignore-next-line */
            $knife = Knife::query()->findOrFail($knifeId);

            /** @phpstan-ignore-next-line */
            if ((string) $knife->company_id !== (string) $order->company_id) {
                abort(422, 'This knife belongs to a different customer company.');
            }

            if ($knife->order_id !== null) {
                abort(422, 'This knife already belongs to an order.');
            }

            $before = [
                'order_id' => null,
                'booking_id' => $knife->booking_id,
            ];

            /** @phpstan-ignore-next-line */
            $knife->order_id = $order->id;
            /** @phpstan-ignore-next-line */
            $knife->booking_id = $order->booking_id;
            /** @phpstan-ignore-next-line */
            $knife->save();

            AuditRecorder::record($actor, $knife, 'knife.attached_to_order', [
                'before' => $before,
                'after' => [
                    /** @phpstan-ignore-next-line */
                    'order_id' => (string) $knife->order_id,
                    /** @phpstan-ignore-next-line */
                    'booking_id' => $knife->booking_id !== null ? (string) $knife->booking_id : null,
                ],
                /** @phpstan-ignore-next-line */
                'tag_id' => $knife->tag_id,
            ], $request);

            $this->rebuildMonetaryTotals($order->fresh(['knives']));

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
        return $this->completeOrderAction->execute($order->fresh(), $actor, $request)
            ->load([
                'company:id,name,city',
                'booking:id,scheduled_date',
                /** @phpstan-ignore-next-line */
                'knives' => fn ($q) => $q->latest()->limit(250),
                'operationalRoute:id,name',
            ]);
    }
}
