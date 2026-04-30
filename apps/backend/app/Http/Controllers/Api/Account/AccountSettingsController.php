<?php

namespace App\Http\Controllers\Api\Account;

use App\Http\Requests\Account\AccountUpdateSettingsRequest;
use App\Models\Contact;
use App\Models\User;
use App\Support\Account\CustomerSubscriptionPayload;
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

        /** @phpstan-ignore-next-line */
        $primary = Contact::query()
            ->where('company_id', $company->id)
            ->orderByDesc('billing_contact')
            ->orderBy('created_at')
            ->first();

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
            'primary_contact' => $primary !== null ? [
                'first_name' => $primary->first_name,
                'last_name' => $primary->last_name,
                'email' => $primary->email,
                'phone' => $primary->phone,
                'billing_contact' => (bool) $primary->billing_contact,
            ] : null,
            'subscription' => CustomerSubscriptionPayload::forCompany((string) $company->id),
        ]);
    }

    public function update(AccountUpdateSettingsRequest $request): JsonResponse
    {
        $company = $this->tenantCompany($request);

        /** @phpstan-ignore-next-line */
        $this->authorize('view', $company);

        /** @phpstan-ignore-next-line */
        $actor = $request->user();

        /** @var array<string, mixed> $validated */
        $validated = $request->validated();

        if (data_get($validated, 'user.name') !== null) {
            /** @phpstan-ignore-next-line */
            $this->authorize('updateOwnBasicProfile', $actor);
            User::query()->whereKey($actor->id)->update(['name' => (string) data_get($validated, 'user.name')]);
            /** @phpstan-ignore-next-line */
            $actor->refresh();
        }

        $companyPayload = data_get($validated, 'company');

        if (is_array($companyPayload) && $companyPayload !== []) {
            /** @phpstan-ignore-next-line */
            $this->authorize('updateTenantProfile', $company);

            $patch = [];
            foreach (['phone', 'billing_email', 'name', 'city'] as $field) {
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
