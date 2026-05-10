<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCostImportRequest;
use App\Models\CostImportBatch;
use App\Models\CostImportRow;
use App\Models\User;
use App\Services\Costs\CostImportService;
use App\Support\ApiResponses;
use App\Support\Costs\CostImportBatchJson;
use App\Support\Costs\CostImportRowJson;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

final class CostImportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CostImportBatch::class);

        $perPage = min(max((int) $request->query('per_page', 30), 1), 100);

        /** @var LengthAwarePaginator<int, CostImportBatch> $paginator */
        $paginator = CostImportBatch::query()
            ->with('uploadedBy')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $paginator->setCollection(
            $paginator->getCollection()->map(static fn (CostImportBatch $b): array => CostImportBatchJson::summary($b)),
        );

        return ApiResponses::paginated($paginator, 'batches');
    }

    public function store(StoreCostImportRequest $request, CostImportService $importService): JsonResponse
    {
        $this->authorize('create', CostImportBatch::class);

        /** @var User $user */
        $user = $request->user();
        $batch = $importService->handleUpload($request->file('file'), $user)
            ->load('uploadedBy');

        return ApiResponses::success(['batch' => CostImportBatchJson::summary($batch)], 201);
    }

    public function show(Request $request, CostImportBatch $costImportBatch): JsonResponse
    {
        $this->authorize('view', $costImportBatch);

        $costImportBatch->load('uploadedBy');

        $perPage = min(max((int) $request->query('per_page', 100), 1), 500);

        /** @var LengthAwarePaginator<int, CostImportRow> $paginator */
        $paginator = $costImportBatch->rows()
            ->orderBy('sheet_name')
            ->orderBy('row_number')
            ->paginate($perPage);

        $paginator->setCollection(
            $paginator->getCollection()->map(static fn ($row): array => CostImportRowJson::preview($row)),
        );

        $pagination = [
            'page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'total_pages' => (int) max(1, ceil($paginator->total() / max(1, $paginator->perPage()))),
            'has_more_pages' => $paginator->hasMorePages(),
        ];

        return ApiResponses::successWithMeta(
            ['rows_pagination' => $pagination],
            [
                'batch' => CostImportBatchJson::summary($costImportBatch),
                'rows' => $paginator->items(),
            ],
        );
    }

    public function commit(Request $request, CostImportBatch $costImportBatch, CostImportService $importService): JsonResponse
    {
        $this->authorize('commit', $costImportBatch);

        /** @var User $user */
        $user = $request->user();

        try {
            $batch = $importService->commitBatch($costImportBatch, $user)->load('uploadedBy');
        } catch (InvalidArgumentException $e) {
            return ApiResponses::error($e->getMessage(), 'invalid_import_state', 422);
        }

        return ApiResponses::success(['batch' => CostImportBatchJson::summary($batch)]);
    }
}
