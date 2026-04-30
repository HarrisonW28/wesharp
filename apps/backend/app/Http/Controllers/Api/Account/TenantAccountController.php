<?php

namespace App\Http\Controllers\Api\Account;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Symfony\Component\HttpKernel\Exception\HttpException;

abstract class TenantAccountController extends Controller
{
    /** @throws HttpException */
    protected function tenantCompanyId(\Illuminate\Http\Request $request): string
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        if ($user->company_id === null || ! $user->resolvedRole()->isCustomer()) {
            abort(403);
        }

        /** @phpstan-ignore-next-line */
        return (string) $user->company_id;
    }

    /** @throws HttpException */
    protected function tenantCompany(\Illuminate\Http\Request $request): Company
    {
        $id = $this->tenantCompanyId($request);

        /** @phpstan-ignore-next-line */
        return Company::query()->findOrFail($id);
    }
}
