<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CostCategory;
use App\Support\ApiResponses;
use App\Support\Costs\CostItemJson;
use Illuminate\Http\JsonResponse;

final class CostCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', CostCategory::class);

        $rows = CostCategory::query()
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();

        return ApiResponses::success([
            'items' => $rows->map(static fn (CostCategory $c): array => CostItemJson::categorySummary($c))->values()->all(),
        ]);
    }
}
