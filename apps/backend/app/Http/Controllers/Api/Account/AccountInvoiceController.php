<?php

namespace App\Http\Controllers\Api\Account;

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
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Invoice::class);

        $scoped = $request->duplicate(query: [...$request->query->all(), 'company_id' => $this->tenantCompanyId($request)]);

        /** @phpstan-ignore-next-line */
        $paginator = $this->invoiceService->paginate($scoped);

        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(fn (Invoice $invoice): array => InvoiceJson::listRow($invoice));

        return ApiResponses::paginated($paginator, 'items');
    }
}
