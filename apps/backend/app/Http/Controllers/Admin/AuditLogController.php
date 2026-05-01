<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\Audit\AuditLogQueryService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AuditLogController extends Controller
{
    public function __construct(
        private readonly AuditLogQueryService $auditLogQueryService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AuditLog::class);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $filters = [
            'q' => $request->query('q'),
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
            'actor_id' => $request->query('actor_id'),
            'action' => $request->query('action'),
            'subject_type' => $request->query('subject_type'),
            'company_id' => $request->query('company_id'),
            'request_id' => $request->query('request_id'),
            'per_page' => $request->query('per_page'),
        ];

        $paginator = $this->auditLogQueryService->paginateForStaff($user, $filters);
        $items = $this->auditLogQueryService->presentPage($paginator);
        $paginator->setCollection(collect($items));

        return ApiResponses::paginated($paginator, 'items');
    }
}
