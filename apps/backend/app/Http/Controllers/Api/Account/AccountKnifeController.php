<?php

namespace App\Http\Controllers\Api\Account;

use App\Models\Knife;
use App\Services\Knives\KnifeService;
use App\Support\ApiResponses;
use App\Support\Knives\KnifeJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountKnifeController extends TenantAccountController
{
    public function __construct(
        private readonly KnifeService $knifeService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Knife::class);

        $scoped = $request->duplicate(query: [...$request->query->all(), 'company_id' => $this->tenantCompanyId($request)]);

        /** @phpstan-ignore-next-line */
        $paginator = $this->knifeService->paginate($scoped);

        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(fn (Knife $k): array => KnifeJson::summary($k));

        return ApiResponses::paginated($paginator, 'items');
    }
}
