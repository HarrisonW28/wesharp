<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Invoices\CreateInvoiceFromOrderAction;
use App\Enums\InvoiceStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\AddKnifeToOrderRequest;
use App\Http\Requests\AttachKnifeToOrderRequest;
use App\Http\Requests\BulkAddKnivesRequest;
use App\Http\Requests\CompleteOrderRequest;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Models\Invoice;
use App\Models\Order;
use App\Services\Orders\OrderService;
use App\Support\ApiResponses;
use App\Support\Knives\KnifeJson;
use App\Support\Orders\OrderJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService,
        private readonly CreateInvoiceFromOrderAction $createInvoiceFromOrderAction,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $paginator = $this->orderService->paginate($request);
        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(
            fn (Order $order): array => OrderJson::listRow($order)
        );

        return ApiResponses::paginated($paginator, 'items');
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $this->authorize('create', Order::class);

        $validated = $request->validated();

        /** @phpstan-ignore-next-line */
        $payload = [
            'company_id' => $validated['company_id'],
            'booking_id' => $validated['booking_id'],
            'route_id' => $validated['route_id'] ?? null,
            'order_status' => isset($validated['order_status'])
                ? OrderStatus::from($validated['order_status'])
                : OrderStatus::Draft,
            'knife_count' => (int) ($validated['knife_count'] ?? 0),
            'price_per_knife_pence' => $validated['price_per_knife_pence'] ?? null,
            'discount_pence' => (int) ($validated['discount_pence'] ?? 0),
            'payment_status' => isset($validated['payment_status'])
                ? OrderPaymentStatus::from($validated['payment_status'])
                : OrderPaymentStatus::Unpaid,
            'currency' => $validated['currency'] ?? 'GBP',
            'subtotal_pence' => (int) ($validated['subtotal_pence'] ?? 0),
            'tax_pence' => (int) ($validated['tax_pence'] ?? 0),
            'total_pence' => (int) ($validated['total_pence'] ?? 0),
        ];

        /** @phpstan-ignore-next-line */
        $order = $this->orderService->create($payload, $request->user(), $request);

        return ApiResponses::success(OrderJson::detail($order), 201);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        /** @phpstan-ignore-next-line */
        $order->loadMissing([
            'company:id,name,city',
            'booking:id,scheduled_date',
            'operationalRoute:id,name,route_status,scheduled_date',
            'knives' => fn ($q) => $q->orderBy('position')->orderBy('created_at')->limit(500),
        ]);

        return ApiResponses::success(OrderJson::detail($order));
    }

    public function update(UpdateOrderRequest $request, Order $order): JsonResponse
    {
        $this->authorize('update', $order);

        $order = $this->orderService->update($order, $request->validated(), $request->user(), $request);

        $order->loadMissing([
            'company:id,name,city',
            'booking:id,scheduled_date',
            'operationalRoute:id,name',
            'knives' => fn ($q) => $q->orderBy('position')->limit(250),
        ]);

        return ApiResponses::success(OrderJson::detail($order));
    }

    public function complete(CompleteOrderRequest $request, Order $order): JsonResponse
    {
        $this->authorize('complete', $order);

        if ($request->wantsInvoiceDraft()) {
            $this->authorize('invoiceFromOrder', $order);
        }

        /** @phpstan-ignore-next-line */
        $order = $this->orderService->complete($order->fresh(['knives']), $request->user(), $request)->loadMissing([
            /** @phpstan-ignore-next-line */
            'knives' => fn ($q) => $q->latest()->limit(250),
            'booking:id',
            'operationalRoute:id',
        ]);

        $draftInvoice = null;

        if ($request->wantsInvoiceDraft()) {
            /** @phpstan-ignore-next-line */
            $existing = Invoice::query()
                /** @phpstan-ignore-next-line */
                ->where('order_id', $order->id)
                ->where('invoice_status', '!=', InvoiceStatus::Void->value)
                /** @phpstan-ignore-next-line */
                ->first();

            if ($existing !== null) {
                /** @phpstan-ignore-next-line */
                $draftInvoice = [
                    'id' => (string) $existing->id,
                    /** @phpstan-ignore-next-line */
                    'invoice_number' => $existing->invoice_number,
                    'already_existed' => true,
                ];
            } else {
                /** @phpstan-ignore-next-line */
                $inv = $this->createInvoiceFromOrderAction->execute($order, $request->user(), $request);
                /** @phpstan-ignore-next-line */
                $draftInvoice = [
                    'id' => (string) $inv->id,
                    /** @phpstan-ignore-next-line */
                    'invoice_number' => $inv->invoice_number,
                    'already_existed' => false,
                ];
            }
        }

        /** @phpstan-ignore-next-line */
        return ApiResponses::success(array_merge(OrderJson::detail($order), [
            'draft_invoice' => $draftInvoice,
        ]));
    }

    public function addKnife(AddKnifeToOrderRequest $request, Order $order): JsonResponse
    {
        $this->authorize('manipulateKnives', $order);

        $knife = $this->orderService->addKnife($order->fresh(), $request->validated(), $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife), 201);
    }

    public function attachKnife(AttachKnifeToOrderRequest $request, Order $order): JsonResponse
    {
        $this->authorize('manipulateKnives', $order);

        /** @phpstan-ignore-next-line */
        $knife = $this->orderService->attachKnifeFromInventory(
            $order->fresh(),
            $request->validated('knife_id'),
            $request->user(),
            $request
        );

        return ApiResponses::success(KnifeJson::detail($knife), 201);
    }

    public function bulkAddKnives(BulkAddKnivesRequest $request, Order $order): JsonResponse
    {
        $this->authorize('manipulateKnives', $order);

        $result = $this->orderService->bulkAddKnives($order->fresh(), $request->validated(), $request->user(), $request);

        /** @phpstan-ignore-next-line */
        /** @var Order $freshOrder */
        $freshOrder = $result['order'];
        /** @phpstan-ignore-next-line */
        $knifeIds = $result['knife_ids'];

        $freshOrder->loadMissing([
            'knives' => fn ($q) => $q->latest()->limit(200),
            'company:id,name,city',
            'booking:id,scheduled_date',
            'operationalRoute:id,name',
        ]);

        return ApiResponses::success([
            'order' => OrderJson::detail($freshOrder),
            'knife_ids' => $knifeIds,
        ]);
    }
}
