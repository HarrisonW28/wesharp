<?php

namespace App\Services\Knives;

use App\Enums\KnifeServiceKind;
use App\Models\Knife;
use App\Models\KnifeServiceAssignment;
use App\Models\Order;

final class KnifeServiceAssignmentRecorder
{
    public function openForOrder(Knife $knife, Order $order, KnifeServiceKind $kind): void
    {
        KnifeServiceAssignment::query()->create([
            'knife_id' => $knife->id,
            'order_id' => $order->id,
            'company_id' => $knife->company_id,
            'service_kind' => $kind,
            'linked_at' => now(),
            'unlinked_at' => null,
        ]);
    }

    public function closeOpenForKnife(Knife $knife): void
    {
        KnifeServiceAssignment::query()
            ->where('knife_id', $knife->id)
            ->whereNull('unlinked_at')
            ->update(['unlinked_at' => now()]);
    }
}
