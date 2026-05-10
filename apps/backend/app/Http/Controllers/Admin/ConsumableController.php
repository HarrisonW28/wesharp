<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreConsumableUsageRequest;
use App\Http\Requests\UpdateConsumableRequest;
use App\Models\Consumable;
use App\Models\ConsumableUsage;
use App\Models\User;
use App\Support\ApiResponses;
use App\Support\Costs\ConsumableJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ConsumableController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Consumable::class);

        $query = Consumable::query()
            ->with(['costItem.category'])
            ->whereHas('costItem')
            ->join('cost_items', 'cost_items.id', '=', 'consumables.cost_item_id')
            ->orderBy('cost_items.name')
            ->select('consumables.*');

        $onlyLow = $request->boolean('low_stock');
        if ($onlyLow) {
            $query->whereNotNull('consumables.reorder_threshold')
                ->whereColumn('consumables.stock_quantity', '<=', 'consumables.reorder_threshold');
        }

        $rows = $query->get()->map(static fn (Consumable $c): array => ConsumableJson::detail($c))->values()->all();

        return ApiResponses::success(['items' => $rows]);
    }

    public function update(UpdateConsumableRequest $request, Consumable $consumable): JsonResponse
    {
        $this->authorize('update', $consumable);

        $validated = $request->validated();
        foreach ([
            'stock_quantity',
            'stock_unit',
            'reorder_threshold',
            'reorder_note',
            'last_reorder_date',
            'estimated_uses_per_unit',
            'cost_per_knife_estimate_pence',
            'status',
        ] as $field) {
            if (array_key_exists($field, $validated)) {
                $consumable->{$field} = $validated[$field];
            }
        }

        $consumable->save();

        return ApiResponses::success(['item' => ConsumableJson::detail($consumable->fresh(['costItem.category']))]);
    }

    public function storeUsage(StoreConsumableUsageRequest $request, Consumable $consumable): JsonResponse
    {
        $this->authorize('logUsage', $consumable);

        $validated = $request->validated();
        /** @var User $user */
        $user = $request->user();

        $qty = (float) $validated['quantity_used'];

        DB::transaction(function () use ($consumable, $validated, $qty, $user): void {
            ConsumableUsage::query()->create([
                'consumable_id' => $consumable->id,
                'usage_date' => $validated['usage_date'],
                'quantity_used' => $qty,
                'order_id' => $validated['order_id'] ?? null,
                'route_id' => $validated['route_id'] ?? null,
                'knife_id' => $validated['knife_id'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_by_user_id' => $user->id,
            ]);

            $newStock = max(0.0, (float) $consumable->stock_quantity - $qty);
            $consumable->stock_quantity = $newStock;
            $consumable->save();
        });

        return ApiResponses::success(
            ['item' => ConsumableJson::detail($consumable->fresh(['costItem.category']))],
            201,
        );
    }
}
