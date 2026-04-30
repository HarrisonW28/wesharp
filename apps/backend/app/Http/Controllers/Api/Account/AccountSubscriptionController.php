<?php

namespace App\Http\Controllers\Api\Account;

use App\Support\Account\CustomerSubscriptionPayload;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountSubscriptionController extends TenantAccountController
{
    public function show(Request $request): JsonResponse
    {
        $company = $this->tenantCompany($request);

        /** @phpstan-ignore-next-line */
        $this->authorize('view', $company);

        /** @phpstan-ignore-next-line */
        $companyId = (string) $company->id;

        return ApiResponses::success([
            'subscription' => CustomerSubscriptionPayload::forCompany($companyId),
        ]);
    }
}
