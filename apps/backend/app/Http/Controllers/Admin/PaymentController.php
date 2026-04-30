<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Payments\RecordManualPaymentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\RecordManualPaymentRequest;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\Payments\PaymentService;
use App\Support\ApiResponses;
use App\Support\Payments\PaymentJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly RecordManualPaymentAction $recordManualPaymentAction,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Payment::class);

        $paginator = $this->paymentService->paginate($request);
        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(
            fn (Payment $p): array => PaymentJson::detail($p)
        );

        return ApiResponses::paginated($paginator, 'items');
    }

    public function manual(RecordManualPaymentRequest $request): JsonResponse
    {
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->findOrFail($request->validated('invoice_id'));

        $this->authorize('recordManualPayment', $invoice);

        /** @phpstan-ignore-next-line */
        $payment = $this->recordManualPaymentAction->execute(
            $invoice,
            $request->validated(),
            $request->user(),
            $request
        );

        return ApiResponses::success(PaymentJson::detail($payment), 201);
    }
}
