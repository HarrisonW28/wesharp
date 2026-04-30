<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Knives\MarkKnifeInspectedAction;
use App\Actions\Knives\MarkKnifeQualityCheckedAction;
use App\Actions\Knives\MarkKnifeReturnedAction;
use App\Actions\Knives\MarkKnifeSharpenedAction;
use App\Actions\Knives\ReportKnifeIssueAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\ReportKnifeIssueRequest;
use App\Http\Requests\StoreKnifeRequest;
use App\Http\Requests\UpdateKnifeRequest;
use App\Models\Knife;
use App\Models\Order;
use App\Services\Knives\KnifeService;
use App\Services\Orders\OrderService;
use App\Support\ApiResponses;
use App\Support\Knives\KnifeJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class KnifeController extends Controller
{
    public function __construct(
        private readonly KnifeService $knifeService,
        private readonly OrderService $orderService,
        private readonly MarkKnifeInspectedAction $markKnifeInspectedAction,
        private readonly MarkKnifeSharpenedAction $markKnifeSharpenedAction,
        private readonly MarkKnifeQualityCheckedAction $markKnifeQualityCheckedAction,
        private readonly MarkKnifeReturnedAction $markKnifeReturnedAction,
        private readonly ReportKnifeIssueAction $reportKnifeIssueAction,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Knife::class);

        $paginator = $this->knifeService->paginate($request);

        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(
            fn (Knife $k): array => KnifeJson::summary($k)
        );

        return ApiResponses::paginated($paginator, 'items');
    }

    public function store(StoreKnifeRequest $request): JsonResponse
    {
        /** @phpstan-ignore-next-line */
        $order = Order::query()->findOrFail($request->validated('order_id'));

        $this->authorize('manipulateKnives', $order);

        $validated = $request->validated();

        unset($validated['order_id']);

        /** @phpstan-ignore-next-line */
        $knife = $this->orderService->addKnife($order->fresh(['company_id', 'booking_id']), $validated, $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife), 201);
    }

    public function show(Request $request, Knife $knife): JsonResponse
    {
        $this->authorize('view', $knife);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function update(UpdateKnifeRequest $request, Knife $knife): JsonResponse
    {
        $this->authorize('update', $knife);

        $knife = $this->knifeService->updateAttributes($knife, $request->validated(), $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function markInspected(Request $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        $knife = $this->markKnifeInspectedAction->execute($knife, $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function markSharpened(Request $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        $knife = $this->markKnifeSharpenedAction->execute($knife, $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function markQualityChecked(Request $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        $knife = $this->markKnifeQualityCheckedAction->execute($knife, $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function markReturned(Request $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        $knife = $this->markKnifeReturnedAction->execute($knife, $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function reportIssue(ReportKnifeIssueRequest $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        /** @phpstan-ignore-next-line */
        $validated = $request->validated();

        $knife = $this->reportKnifeIssueAction->execute(
            $knife,
            $validated['damage_notes'],
            $request->user(),
            $request,
        );

        return ApiResponses::success(KnifeJson::detail($knife));
    }
}
