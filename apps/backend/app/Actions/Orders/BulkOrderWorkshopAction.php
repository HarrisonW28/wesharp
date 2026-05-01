<?php

declare(strict_types=1);

namespace App\Actions\Orders;

use App\Actions\Knives\TransitionKnifeStatusAction;
use App\Enums\KnifeStatus;
use App\Models\Knife;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\Audit\AuditRecorder;
use App\Services\Knives\KnifeService;
use App\Services\Orders\OrderService;
use App\Support\Knives\KnifeStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class BulkOrderWorkshopAction
{
    public function __construct(
        private readonly TransitionKnifeStatusAction $transitionKnifeStatusAction,
        private readonly TransitionOrderItemServiceStatusAction $transitionOrderItemServiceStatusAction,
        private readonly KnifeService $knifeService,
        private readonly OrderService $orderService,
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function execute(Order $order, array $validated, ?Authenticatable $actor, ?Request $request): array
    {
        /** @var string $mode */
        $mode = $validated['mode'];

        return DB::transaction(function () use ($order, $validated, $mode, $actor, $request): array {
            $summary = [
                'mode' => $mode,
                'applied_knives' => [],
                'skipped_knives' => [],
                'applied_line_items' => [],
                'skipped_line_items' => [],
                'updated_line_prices' => 0,
                'updated_knife_types' => 0,
                'updated_inspection_visibility' => 0,
                'notes_appended' => 0,
            ];

            $knifeIds = isset($validated['knife_ids']) && is_array($validated['knife_ids'])
                ? $validated['knife_ids']
                : [];
            $lineIds = isset($validated['line_item_ids']) && is_array($validated['line_item_ids'])
                ? $validated['line_item_ids']
                : [];

            $anyMutation = false;

            if ($mode === 'knife_status') {
                /** @var string $targetRaw */
                $targetRaw = $validated['target_status'];
                $target = KnifeStatus::from($targetRaw);

                foreach ($knifeIds as $kid) {
                    $kid = (string) $kid;
                    $knife = Knife::query()->find($kid);
                    if ($knife === null || (string) $knife->order_id !== (string) $order->id) {
                        $summary['skipped_knives'][] = [
                            'knife_id' => $kid,
                            'reason' => 'Blade is not on this order.',
                            'current_status' => null,
                        ];

                        continue;
                    }
                    $from = $knife->knife_status ?? KnifeStatus::Logged;
                    if (! KnifeStatusTransitions::canTransition($from, $target)) {
                        $summary['skipped_knives'][] = [
                            'knife_id' => $kid,
                            'reason' => sprintf('Cannot go from %s to %s.', $from->value, $target->value),
                            'current_status' => $from->value,
                        ];

                        continue;
                    }
                    $this->transitionKnifeStatusAction->execute($knife, $target, $actor, $request, null);
                    $summary['applied_knives'][] = ['knife_id' => $kid, 'from' => $from->value, 'to' => $target->value];
                    $anyMutation = true;
                }

                foreach ($lineIds as $lid) {
                    $lid = (string) $lid;
                    $item = OrderItem::query()->find($lid);
                    if ($item === null || (string) $item->order_id !== (string) $order->id) {
                        $summary['skipped_line_items'][] = [
                            'order_item_id' => $lid,
                            'reason' => 'Line is not on this order.',
                        ];

                        continue;
                    }
                    if ($item->knife_id !== null) {
                        $summary['skipped_line_items'][] = [
                            'order_item_id' => $lid,
                            'reason' => 'Line is linked to a blade — use bulk blade status instead.',
                        ];

                        continue;
                    }
                    $from = $item->service_status ?? KnifeStatus::Logged;
                    if (! KnifeStatusTransitions::canTransition($from, $target)) {
                        $summary['skipped_line_items'][] = [
                            'order_item_id' => $lid,
                            'reason' => sprintf('Cannot go from %s to %s.', $from->value, $target->value),
                        ];

                        continue;
                    }
                    $this->transitionOrderItemServiceStatusAction->execute($item, $target, $actor, $request, null);
                    $summary['applied_line_items'][] = ['order_item_id' => $lid, 'from' => $from->value, 'to' => $target->value];
                    $anyMutation = true;
                }
            } elseif ($mode === 'append_notes') {
                /** @var string $text */
                $text = trim((string) $validated['append_notes']);
                $stamp = now()->format('Y-m-d H:i');
                foreach ($knifeIds as $kid) {
                    $kid = (string) $kid;
                    $knife = Knife::query()->find($kid);
                    if ($knife === null || (string) $knife->order_id !== (string) $order->id) {
                        $summary['skipped_knives'][] = [
                            'knife_id' => $kid,
                            'reason' => 'Blade is not on this order.',
                            'current_status' => null,
                        ];

                        continue;
                    }
                    $before = (string) ($knife->notes ?? '');
                    $suffix = "\n{$stamp} — {$text}";
                    $this->knifeService->updateAttributes($knife, ['notes' => trim($before.$suffix)], $actor, $request);
                    $summary['applied_knives'][] = ['knife_id' => $kid, 'action' => 'append_notes'];
                    $summary['notes_appended']++;
                    $anyMutation = true;
                }
            } elseif ($mode === 'knife_type') {
                /** @var string $ktype */
                $ktype = trim((string) $validated['knife_type']);
                foreach ($knifeIds as $kid) {
                    $kid = (string) $kid;
                    $knife = Knife::query()->find($kid);
                    if ($knife === null || (string) $knife->order_id !== (string) $order->id) {
                        $summary['skipped_knives'][] = [
                            'knife_id' => $kid,
                            'reason' => 'Blade is not on this order.',
                            'current_status' => null,
                        ];

                        continue;
                    }
                    $this->knifeService->updateAttributes($knife, ['knife_type' => $ktype], $actor, $request);
                    $summary['applied_knives'][] = ['knife_id' => $kid, 'action' => 'knife_type'];
                    $summary['updated_knife_types']++;
                    $anyMutation = true;
                }
            } elseif ($mode === 'line_prices') {
                /** @var int $pence */
                $pence = (int) $validated['unit_amount_pence'];
                foreach ($lineIds as $lid) {
                    $lid = (string) $lid;
                    $item = OrderItem::query()->find($lid);
                    if ($item === null || (string) $item->order_id !== (string) $order->id) {
                        $summary['skipped_line_items'][] = [
                            'order_item_id' => $lid,
                            'reason' => 'Line is not on this order.',
                        ];

                        continue;
                    }
                    $before = (int) $item->unit_amount_pence;
                    $item->unit_amount_pence = $pence;
                    $item->save();
                    AuditRecorder::record($actor, $item, 'order_item.unit_price_bulk', [
                        'before_pence' => $before,
                        'after_pence' => $pence,
                        'order_id' => (string) $order->id,
                    ], $request);
                    $summary['applied_line_items'][] = ['order_item_id' => $lid, 'unit_amount_pence' => $pence];
                    $summary['updated_line_prices']++;
                    $anyMutation = true;
                }
                if ($summary['updated_line_prices'] > 0) {
                    $this->orderService->rebuildMonetaryTotals($order->fresh(['knives', 'items']));
                }
            } elseif ($mode === 'inspection_visibility') {
                $visible = (bool) $validated['inspection_customer_visible'];
                foreach ($knifeIds as $kid) {
                    $kid = (string) $kid;
                    $knife = Knife::query()->find($kid);
                    if ($knife === null || (string) $knife->order_id !== (string) $order->id) {
                        $summary['skipped_knives'][] = [
                            'knife_id' => $kid,
                            'reason' => 'Blade is not on this order.',
                            'current_status' => null,
                        ];

                        continue;
                    }
                    $this->knifeService->updateAttributes($knife, [
                        'inspection_customer_visible' => $visible,
                    ], $actor, $request);
                    $summary['applied_knives'][] = [
                        'knife_id' => $kid,
                        'action' => 'inspection_customer_visible',
                        'value' => $visible,
                    ];
                    $summary['updated_inspection_visibility']++;
                    $anyMutation = true;
                }
            }

            $summary['any_applied'] = $anyMutation;
            $summary['selected_knife_count'] = count($knifeIds);
            $summary['selected_line_count'] = count($lineIds);

            if ($anyMutation) {
                AuditRecorder::record($actor, $order, 'order.bulk_workshop', [
                    'mode' => $mode,
                    'summary' => $summary,
                ], $request);
            }

            return $summary;
        });
    }
}
