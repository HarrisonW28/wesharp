<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Invoices\CreateInvoiceFromOrderAction;
use App\Actions\Invoices\MarkInvoicePaidAction;
use App\Actions\Invoices\SendInvoicePlaceholderAction;
use App\Actions\Invoices\VoidInvoiceAction;
use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Requests\UpdateInvoiceRequest;
use App\Models\Invoice;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use App\Services\Invoices\InvoiceService;
use App\Support\ApiResponses;
use App\Support\Invoices\InvoiceJson;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class InvoiceController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
        private readonly CreateInvoiceFromOrderAction $createInvoiceFromOrderAction,
        private readonly SendInvoicePlaceholderAction $sendInvoicePlaceholderAction,
        private readonly MarkInvoicePaidAction $markInvoicePaidAction,
        private readonly VoidInvoiceAction $voidInvoiceAction,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Invoice::class);

        $paginator = $this->invoiceService->paginate($request);
        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(
            fn (Invoice $invoice): array => InvoiceJson::listRow($invoice)
        );

        return ApiResponses::paginated($paginator, 'items');
    }

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        /** @phpstan-ignore-next-line */
        $order = Order::query()->findOrFail($request->validated('order_id'));

        $this->authorize('invoiceFromOrder', $order);

        $validated = $request->validated();

        /** @phpstan-ignore-next-line */
        $invoice = $this->createInvoiceFromOrderAction->execute($order, $request->user(), $request, [
            'issue_date' => $validated['issue_date'] ?? null,
            'due_date' => $validated['due_date'] ?? null,
        ]);

        return ApiResponses::success(InvoiceJson::detail($invoice), 201);
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('view', $invoice);

        return ApiResponses::success(InvoiceJson::detail($invoice));
    }

    public function update(UpdateInvoiceRequest $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $invoice);

        if ($invoice->invoice_status === InvoiceStatus::Void || $invoice->invoice_status === InvoiceStatus::Paid) {
            abort(422, 'Invoice metadata cannot be updated in this status.');
        }

        $validated = $request->validated();

        if (isset($validated['due_date'])) {
            /** @phpstan-ignore-next-line */
            $invoice->due_on = new Carbon($validated['due_date']);
        }
        if (isset($validated['issue_date'])) {
            /** @phpstan-ignore-next-line */
            $invoice->issued_on = new Carbon($validated['issue_date']);
        }

        $invoice->save();

        AuditRecorder::record($request->user(), $invoice, 'invoice.updated_meta', [], $request);

        return ApiResponses::success(InvoiceJson::detail($invoice->fresh([
            'payments',
            'items',
            'company:id,name,city',
            'order:id,booking_id',
        ])));
    }

    public function send(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('send', $invoice);

        /** @phpstan-ignore-next-line */
        $invoice = $this->sendInvoicePlaceholderAction->execute($invoice, $request->user(), $request);

        return ApiResponses::success(InvoiceJson::detail($invoice));
    }

    public function markPaid(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('markPaid', $invoice);

        /** @phpstan-ignore-next-line */
        $invoice = $this->markInvoicePaidAction->execute($invoice, $request->user(), $request);

        return ApiResponses::success(InvoiceJson::detail($invoice));
    }

    public function void(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('voidInvoice', $invoice);

        /** @phpstan-ignore-next-line */
        $invoice = $this->voidInvoiceAction->execute($invoice, $request->user(), $request);

        return ApiResponses::success(InvoiceJson::detail($invoice));
    }
}
