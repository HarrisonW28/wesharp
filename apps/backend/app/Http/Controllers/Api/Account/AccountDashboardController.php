<?php

namespace App\Http\Controllers\Api\Account;

use App\Services\Account\AccountDashboardService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountDashboardController extends TenantAccountController
{
    public function show(Request $request, AccountDashboardService $dashboard): JsonResponse
    {
        $company = $this->tenantCompany($request);

        /** @phpstan-ignore-next-line */
        $this->authorize('view', $company);

        /** @phpstan-ignore-next-line */
        return ApiResponses::success([
            /** @phpstan-ignore-next-line */
            'dashboard' => $dashboard->payload($request->user()),
            'basis' => [
                'outstanding_balance' => 'Sum of unpaid invoice totals minus summed payment rows for invoices outside Paid/Void.',
                'monthly_spend' => 'Sum of completed orders.total_pence in the UTC calendar month (orders.updated_at).',
                'knives_sharpened' => 'Count of knives marked sharpened, quality-checked, or returned for this tenant.',
            ],
        ]);
    }
}
