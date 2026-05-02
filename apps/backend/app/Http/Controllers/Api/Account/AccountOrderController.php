<?php

namespace App\Http\Controllers\Api\Account;

use App\Models\Order;
use App\Services\Orders\OrderService;
use App\Support\ApiResponses;
use App\Support\Orders\OrderJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountOrderController extends TenantAccountController
{
    public function __construct(
        private readonly OrderService $orderService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $scoped = $request->duplicate(query: [...$request->query->all(), 'company_id' => $this->tenantCompanyId($request)]);

        /** @phpstan-ignore-next-line */
        $paginator = $this->orderService->paginate($scoped, withOperationalRoute: false);

        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(
            fn (Order $order): array => OrderJson::portalListRow($order)
        );

        return ApiResponses::paginated($paginator, 'items');
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        /** @phpstan-ignore-next-line */
        $order->loadMissing([
            'company:id,name,city',
            'booking:id,scheduled_date,booking_status,estimated_knife_count,actual_knife_count,service_type',
            'knives' => fn ($q) => $q->orderBy('position')->orderBy('created_at')->limit(250),
            'items' => fn ($q) => $q->orderBy('created_at')->with(['knife:id,knife_status,label,tag_id']),
            'invoices' => fn ($q) => $q->orderByDesc('created_at')->limit(1),
        ]);

        return ApiResponses::success(OrderJson::portalDetail($order));
    }
}
