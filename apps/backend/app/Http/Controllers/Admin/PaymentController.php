<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Payments\RecordManualPaymentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\RecordManualPaymentRequest;
use App\Http\Requests\UpdatePaymentRecordRequest;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\Audit\AuditRecorder;
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

    public function update(UpdatePaymentRecordRequest $request, Payment $payment): JsonResponse
    {
        $this->authorize('update', $payment);

        $validated = $request->validated();
        $before = [
            'reference' => $payment->reference,
            'notes' => $payment->notes,
        ];

        if (array_key_exists('reference', $validated)) {
            $payment->reference = $validated['reference'];
        }
        if (array_key_exists('notes', $validated)) {
            $payment->notes = $validated['notes'];
        }
        $payment->save();

        AuditRecorder::record($request->user(), $payment, 'payment.adjusted', [
            'before' => $before,
            'after' => [
                'reference' => $payment->reference,
                'notes' => $payment->notes,
            ],
        ], $request);

        /** @phpstan-ignore-next-line */
        return ApiResponses::success(PaymentJson::detail($payment->fresh([
            'company:id,name',
            'invoice:id,invoice_number',
            'order:id',
            'recordedBy:id,name,email',
        ])));
    }
}
