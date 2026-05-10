<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\CostAllocationMethod;
use App\Enums\CostAllocationTargetType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCostAllocationRequest;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\CostAllocation;
use App\Models\Invoice;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\RouteStop;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Costs\CostAllocationJson;
use App\Support\Costs\CostAttributionRollup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

final class CostAllocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CostAllocation::class);

        $perPage = max(1, min(100, (int) $request->query('per_page', '40')));
        $companyId = $request->query('company_id');

        $query = CostAllocation::query()
            ->with(['costItem', 'createdBy'])
            ->latest();

        if (is_string($companyId) && $companyId !== '') {
            CostAttributionRollup::scopeAllocationsForCompany($query, $companyId);
        }

        $page = $query->paginate($perPage);

        $items = collect($page->items())->map(static fn (CostAllocation $row): array => CostAllocationJson::ledgerRow($row))->values()->all();

        return ApiResponses::success([
            'items' => $items,
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function store(StoreCostAllocationRequest $request): JsonResponse
    {
        $this->authorize('create', CostAllocation::class);

        $validated = $request->validated();
        /** @var User $user */
        $user = $request->user();

        $targetType = $validated['target_type'];
        if (! $targetType instanceof CostAllocationTargetType) {
            $targetType = CostAllocationTargetType::from((string) $targetType);
        }

        $allocationMethod = $validated['allocation_method'];
        if (! $allocationMethod instanceof CostAllocationMethod) {
            $allocationMethod = CostAllocationMethod::from((string) $allocationMethod);
        }

        $targetId = (string) $validated['target_id'];

        if (! $this->targetExists($targetType, $targetId)) {
            throw ValidationException::withMessages([
                'target_id' => 'No matching target for the selected target_type.',
            ]);
        }

        $allocation = CostAllocation::query()->create([
            'cost_item_id' => $validated['cost_item_id'] ?? null,
            'consumable_usage_id' => $validated['consumable_usage_id'] ?? null,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'amount_pence' => (int) $validated['amount_pence'],
            'currency' => isset($validated['currency']) ? strtoupper((string) $validated['currency']) : 'GBP',
            'allocation_method' => $allocationMethod,
            'notes' => $validated['notes'] ?? null,
            'created_by_user_id' => $user->id,
        ]);

        AuditRecorder::record($user, $allocation, 'cost_allocation.created', [
            'target_type' => $targetType->value,
            'target_id' => $targetId,
            'amount_pence' => (int) $validated['amount_pence'],
            'allocation_method' => $allocation->allocation_method->value,
        ]);

        return ApiResponses::success(['item' => CostAllocationJson::ledgerRow($allocation->fresh(['costItem', 'createdBy']))], 201);
    }

    private function targetExists(CostAllocationTargetType $type, string $id): bool
    {
        return match ($type) {
            CostAllocationTargetType::Company => Company::query()->whereKey($id)->exists(),
            CostAllocationTargetType::Order => Order::query()->whereKey($id)->exists(),
            CostAllocationTargetType::Route => OperationalRoute::query()->whereKey($id)->exists(),
            CostAllocationTargetType::RouteStop => RouteStop::query()->whereKey($id)->exists(),
            CostAllocationTargetType::Booking => Booking::query()->whereKey($id)->exists(),
            CostAllocationTargetType::Invoice => Invoice::query()->whereKey($id)->exists(),
            CostAllocationTargetType::Subscription => CompanySubscription::query()->whereKey($id)->exists(),
        };
    }
}
