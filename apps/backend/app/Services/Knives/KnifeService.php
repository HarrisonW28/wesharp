<?php

namespace App\Services\Knives;

use App\Enums\KnifeStatus;
use App\Models\Knife;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

final class KnifeService
{
    public function allocateTagId(?Order $order = null): string
    {
        do {
            $candidate = $order !== null
                ? 'WS-'.strtoupper(Str::substr(str_replace('-', '', (string) $order->getKey()), 0, 12)).'-'.Str::random(4)
                : 'WS-'.str_replace('-', '', (string) Str::uuid());

            $exists = Knife::query()->where('tag_id', $candidate)->exists();
        } while ($exists);

        return $candidate;
    }

    /**
     * @param  array{
     *   knife_type?: string|null,
     *   description?: string|null,
     *   condition_before?: string|null,
     *   knife_status?: KnifeStatus,
     *   label?: string|null,
     *   notes?: string|null,
     *   position?: int|null,
     * }  $payload
     */
    public function createForOrder(Order $order, array $payload = []): Knife
    {
        $status = $payload['knife_status'] ?? KnifeStatus::Logged;

        return Knife::query()->create([
            'company_id' => $order->company_id,
            'booking_id' => $order->booking_id,
            'order_id' => $order->id,
            'knife_status' => $status,
            'tag_id' => $this->allocateTagId($order),
            'knife_type' => $payload['knife_type'] ?? null,
            'description' => $payload['description'] ?? ($payload['label'] ?? null),
            'condition_before' => $payload['condition_before'] ?? null,
            'damage_notes' => $payload['damage_notes'] ?? null,
            'label' => $payload['label'] ?? null,
            'position' => $payload['position'] ?? null,
            'notes' => $payload['notes'] ?? null,
        ]);
    }

    public function paginate(Request $request): LengthAwarePaginator
    {
        $perPage = min(100, max(1, (int) $request->query('per_page', 25)));

        $query = Knife::query()
            ->with([
                'company:id,name,city',
                'order:id,order_status',
                'booking:id,scheduled_date',
            ])
            ->orderByDesc('updated_at');

        if (($tag = trim((string) $request->query('tag_id', ''))) !== '') {
            $query->where('tag_id', 'like', '%'.$tag.'%');
        }

        if (($st = trim((string) $request->query('status', ''))) !== '') {
            $query->where('knife_status', $st);
        }

        if (($cid = trim((string) $request->query('company_id', ''))) !== '') {
            $query->where('company_id', $cid);
        }

        if (($oid = trim((string) $request->query('order_id', ''))) !== '') {
            $query->where('order_id', $oid);
        }

        if (($q = trim((string) $request->query('q', ''))) !== '') {
            $query->where(function ($qq) use ($q): void {
                $qq->where('tag_id', 'like', '%'.$q.'%')
                    ->orWhere('description', 'like', '%'.$q.'%')
                    ->orWhere('label', 'like', '%'.$q.'%');
            });
        }

        return $query->paginate($perPage)->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $patch
     */
    public function updateAttributes(Knife $knife, array $patch, Authenticatable $actor, Request $request): Knife
    {
        $keys = array_keys($patch);
        $before = $knife->only($keys);

        $knife->fill($patch);
        $knife->save();

        AuditRecorder::record($actor, $knife, 'knife.updated', [
            'before' => $before,
            'after' => $knife->only($keys),
        ], $request);

        return $knife->fresh();
    }
}
