<?php

declare(strict_types=1);

namespace App\Actions\Orders;

use App\Enums\KnifeStatus;
use App\Models\OrderItem;
use App\Services\Audit\AuditRecorder;
use App\Support\Knives\KnifeStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Service workflow for billable lines that are not linked to a `knives` row. */
final class TransitionOrderItemServiceStatusAction
{
    public function execute(
        OrderItem $item,
        KnifeStatus $target,
        ?Authenticatable $actor,
        ?Request $request,
        ?string $note = null,
    ): OrderItem {
        return DB::transaction(function () use ($item, $target, $actor, $request, $note): OrderItem {
            $item->refresh();

            if ($item->knife_id !== null) {
                abort(422, 'This line is linked to a blade — update the knife status instead.');
            }

            $from = $item->service_status ?? KnifeStatus::Logged;
            KnifeStatusTransitions::assertCan($from, $target);

            $item->service_status = $target;
            $item->save();

            $payload = [
                'from' => $from->value,
                'to' => $target->value,
                'order_id' => (string) $item->order_id,
            ];
            if ($note !== null && trim($note) !== '') {
                $payload['note'] = trim($note);
            }

            AuditRecorder::record($actor, $item, 'order_item.status_changed', $payload, $request);

            return $item->fresh();
        });
    }
}
