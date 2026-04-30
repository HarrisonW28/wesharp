<?php

namespace App\Http\Controllers\Api\Account;

use App\Http\Requests\Account\AccountUpdateSettingsRequest;
use App\Models\User;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountSettingsController extends TenantAccountController
{
    public function show(Request $request): JsonResponse
    {
        $company = $this->tenantCompany($request);

        /** @phpstan-ignore-next-line */
        $this->authorize('view', $company);

        /** @phpstan-ignore-next-line */
        $actor = $request->user();

        return ApiResponses::success([
            'user' => [
                'id' => (string) $actor->id,
                'name' => $actor->name,
                'email' => $actor->email,
            ],
            'company' => [
                'id' => (string) $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'city' => $company->city,
                'phone' => $company->phone,
                'billing_email' => $company->billing_email,
                'company_status' => $company->company_status?->value,
            ],
        ]);
    }

    public function update(AccountUpdateSettingsRequest $request): JsonResponse
    {
        $company = $this->tenantCompany($request);

        /** @phpstan-ignore-next-line */
        $this->authorize('updateTenantProfile', $company);

        /** @phpstan-ignore-next-line */
        $actor = $request->user();

        /** @var array<string, mixed> $validated */
        $validated = $request->validated();

        if (data_get($validated, 'user.name') !== null) {
            $this->authorize('updateOwnBasicProfile', $actor);
            User::query()->whereKey($actor->id)->update(['name' => (string) data_get($validated, 'user.name')]);
        }

        $companyPayload = data_get($validated, 'company');

        if (is_array($companyPayload) && $companyPayload !== []) {
            $patch = [];
            foreach (['phone', 'billing_email', 'name'] as $field) {
                if (array_key_exists($field, $companyPayload)) {
                    $patch[$field] = $companyPayload[$field];
                }
            }

            if ($patch !== []) {
                $company->update($patch);
            }
        }

        return $this->show($request);
    }
}
