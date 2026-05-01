<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Invoices\CreateInvoiceFromOrderAction;
use App\Actions\Invoices\MarkInvoicePaidAction;
use App\Actions\Invoices\SendInvoicePlaceholderAction;
use App\Actions\Invoices\UpdateDraftInvoiceLinesAction;
use App\Actions\Invoices\VoidInvoiceAction;
use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Requests\UpdateInvoiceRequest;
use App\Http\Requests\VoidInvoiceRequest;
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
        private readonly UpdateDraftInvoiceLinesAction $updateDraftInvoiceLinesAction,
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
            abort(422, 'Invoice cannot be updated in this status.');
        }

        $validated = $request->validated();

        if (isset($validated['items'])) {
            if ($invoice->invoice_status !== InvoiceStatus::Draft) {
                abort(422, 'Line items can only be replaced while the invoice is in draft.');
            }

            /** @var list<array{description: string, quantity: int, unit_amount_pence: int}> $lines */
            $lines = $validated['items'];
            $invoice = $this->updateDraftInvoiceLinesAction->execute(
                $invoice,
                $lines,
                $request->user(),
                $request
            );
            unset($validated['items']);
        }

        $dateKeys = array_intersect_key($validated, array_flip(['issue_date', 'due_date']));
        if ($dateKeys !== []) {
            if (isset($dateKeys['due_date'])) {
                /** @phpstan-ignore-next-line */
                $invoice->due_on = new Carbon((string) $dateKeys['due_date']);
            }
            if (isset($dateKeys['issue_date'])) {
                /** @phpstan-ignore-next-line */
                $invoice->issued_on = new Carbon((string) $dateKeys['issue_date']);
            }
            $invoice->save();

            AuditRecorder::record($request->user(), $invoice, 'invoice.updated_meta', [
                'issue_date' => $dateKeys['issue_date'] ?? null,
                'due_date' => $dateKeys['due_date'] ?? null,
            ], $request);
        }

        return ApiResponses::success(InvoiceJson::detail($invoice->fresh()));
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

    public function void(VoidInvoiceRequest $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('voidInvoice', $invoice);

        /** @var string $reason */
        $reason = $request->validated('reason');

        /** @phpstan-ignore-next-line */
        $invoice = $this->voidInvoiceAction->execute($invoice, $request->user(), $request, $reason);

        return ApiResponses::success(InvoiceJson::detail($invoice));
    }
}
