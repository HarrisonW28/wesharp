<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\CostFrequency;
use App\Enums\CostStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCostItemRequest;
use App\Http\Requests\UpdateCostItemRequest;
use App\Models\CostItem;
use App\Models\User;
use App\Support\ApiResponses;
use App\Support\Costs\CostItemJson;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CostItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CostItem::class);

        $query = CostItem::query()->with('category')->orderByDesc('priority')->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', CostStatus::from((string) $request->query('status')));
        } elseif (! $request->boolean('include_archived')) {
            $query->excludeArchivedByDefault();
        }

        if ($request->filled('frequency')) {
            $query->where('frequency', CostFrequency::from((string) $request->query('frequency')));
        }

        if ($request->filled('category_slug')) {
            $slug = (string) $request->query('category_slug');
            $query->whereHas('category', static fn ($q) => $q->where('slug', $slug));
        }

        if ($request->filled('q')) {
            $needle = trim((string) $request->query('q'));
            if ($needle !== '') {
                $safe = addcslashes($needle, '%_\\');
                $query->where('name', 'like', '%'.$safe.'%');
            }
        }

        $perPage = min(max((int) $request->query('per_page', 50), 1), 200);

        /** @var LengthAwarePaginator<int, CostItem> $paginator */
        $paginator = $query->paginate($perPage);
        $paginator->setCollection(
            $paginator->getCollection()->map(static fn (CostItem $item): array => CostItemJson::detail($item)),
        );

        return ApiResponses::paginated($paginator, 'items');
    }

    public function store(StoreCostItemRequest $request): JsonResponse
    {
        $this->authorize('create', CostItem::class);

        $validated = $request->validated();
        $frequency = CostFrequency::from((string) $validated['frequency']);

        /** @var User $actor */
        $actor = $request->user();

        $item = CostItem::query()->create([
            'category_id' => $validated['category_id'],
            'tier_label' => $validated['tier_label'] ?? null,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'amount_pence' => (int) $validated['amount_pence'],
            'currency' => strtoupper((string) ($validated['currency'] ?? 'GBP')),
            'frequency' => $frequency,
            'status' => CostStatus::from((string) $validated['status']),
            'supplier_name' => $validated['supplier_name'] ?? null,
            'supplier_url' => $validated['supplier_url'] ?? null,
            'priority' => (int) ($validated['priority'] ?? 0),
            'notes' => $validated['notes'] ?? null,
            'is_recurring' => $frequency->isRecurring(),
            'is_consumable' => (bool) ($validated['is_consumable'] ?? false),
            'is_seeded' => false,
            'source' => 'manual',
            'starts_on' => $validated['starts_on'] ?? null,
            'ends_on' => $validated['ends_on'] ?? null,
            'next_due_on' => $validated['next_due_on'] ?? null,
            'renews_on' => $validated['renews_on'] ?? null,
            'commitment_cancellable' => array_key_exists('commitment_cancellable', $validated)
                ? (bool) $validated['commitment_cancellable']
                : true,
            'payment_method_note' => $validated['payment_method_note'] ?? null,
            'created_by_user_id' => $actor->id,
            'updated_by_user_id' => $actor->id,
        ]);

        $item->load('category');

        return ApiResponses::success(['item' => CostItemJson::detail($item)], 201);
    }

    public function update(UpdateCostItemRequest $request, CostItem $costItem): JsonResponse
    {
        $this->authorize('update', $costItem);

        $validated = $request->validated();
        /** @var User $actor */
        $actor = $request->user();

        foreach ([
            'category_id',
            'tier_label',
            'name',
            'description',
            'amount_pence',
            'supplier_name',
            'supplier_url',
            'priority',
            'notes',
            'is_consumable',
            'starts_on',
            'ends_on',
            'next_due_on',
            'renews_on',
            'payment_method_note',
        ] as $field) {
            if (array_key_exists($field, $validated)) {
                $costItem->{$field} = $validated[$field];
            }
        }

        if (array_key_exists('currency', $validated) && $validated['currency'] !== null) {
            $costItem->currency = strtoupper((string) $validated['currency']);
        }

        if (array_key_exists('commitment_cancellable', $validated)) {
            $costItem->commitment_cancellable = (bool) $validated['commitment_cancellable'];
        }

        if (array_key_exists('frequency', $validated)) {
            $frequency = CostFrequency::from((string) $validated['frequency']);
            $costItem->frequency = $frequency;
            $costItem->is_recurring = $frequency->isRecurring();
        }

        if (array_key_exists('status', $validated)) {
            $costItem->status = CostStatus::from((string) $validated['status']);
        }

        $costItem->updated_by_user_id = $actor->id;
        $costItem->save();

        $costItem->load('category');

        return ApiResponses::success(['item' => CostItemJson::detail($costItem)]);
    }

    public function archive(Request $request, CostItem $costItem): JsonResponse
    {
        $this->authorize('archive', $costItem);

        /** @var User $actor */
        $actor = $request->user();

        $costItem->status = CostStatus::Archived;
        $costItem->updated_by_user_id = $actor->id;
        $costItem->save();

        $costItem->load('category');

        return ApiResponses::success(['item' => CostItemJson::detail($costItem)]);
    }
}
