<?php

namespace App\Http\Controllers\Api\Account;

use App\Actions\Invoices\SyncInvoiceOverdueStatusAction;
use App\Actions\Payments\CreateStripeHostedCheckoutSessionAction;
use App\Http\Requests\Invoices\StartInvoiceStripeCheckoutSessionRequest;
use App\Models\Invoice;
use App\Services\Invoices\InvoiceService;
use App\Support\ApiResponses;
use App\Support\Invoices\InvoiceJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountInvoiceController extends TenantAccountController
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
        private readonly SyncInvoiceOverdueStatusAction $syncInvoiceOverdueStatusAction,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Invoice::class);

        $scoped = $request->duplicate(query: [...$request->query->all(), 'company_id' => $this->tenantCompanyId($request)]);

        /** @phpstan-ignore-next-line */
        $paginator = $this->invoiceService->paginate($scoped);

        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(fn (Invoice $invoice): array => InvoiceJson::portalListRow($invoice));

        return ApiResponses::paginated($paginator, 'items');
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('view', $invoice);

        /** @phpstan-ignore-next-line */
        $invoice = $this->syncInvoiceOverdueStatusAction->execute($invoice, $request->user(), $request);

        return ApiResponses::success(InvoiceJson::portalDetail($invoice));
    }

    public function stripeCheckoutSession(StartInvoiceStripeCheckoutSessionRequest $request, Invoice $invoice, CreateStripeHostedCheckoutSessionAction $action): JsonResponse
    {
        $this->authorize('startStripeCheckout', $invoice);

        /** @phpstan-ignore-next-line */
        $invoice = $this->syncInvoiceOverdueStatusAction->execute($invoice, $request->user(), $request);

        return ApiResponses::success($action->execute($invoice, $request->marketingOptIn())->toArray());
    }
}
