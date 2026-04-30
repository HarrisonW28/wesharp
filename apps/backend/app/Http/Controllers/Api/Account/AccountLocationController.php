<?php

namespace App\Http\Controllers\Api\Account;

use App\Http\Requests\Account\AccountStoreCompanyLocationRequest;
use App\Http\Requests\Account\AccountUpdateCompanyLocationRequest;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountLocationController extends TenantAccountController
{
    public function index(Request $request): JsonResponse
    {
        $company = $this->tenantCompany($request);

        /** @phpstan-ignore-next-line */
        $this->authorize('view', $company);

        $items = $company->locations()
            ->orderByDesc('is_default')
            ->orderBy('label')
            ->get()
            ->map(fn (CompanyLocation $l): array => $this->locationPayload($l))
            ->values()
            ->all();

        return ApiResponses::success(['items' => $items]);
    }

    public function store(AccountStoreCompanyLocationRequest $request): JsonResponse
    {
        $company = $this->tenantCompany($request);

        /** @phpstan-ignore-next-line */
        $this->authorize('manageAccountLocations', $company);

        $validated = $request->validated();
        $makeDefault = (bool) ($validated['is_default'] ?? false);
        unset($validated['is_default']);

        /** @phpstan-ignore-next-line */
        $location = CompanyLocation::query()->create(array_merge($validated, [
            'company_id' => (string) $company->getKey(),
        ]));

        if ($makeDefault || $company->locations()->count() === 1) {
            $this->setAsOnlyDefault($company, $location);
        }

        return ApiResponses::success($this->locationPayload($location->fresh()), 201);
    }

    public function update(
        AccountUpdateCompanyLocationRequest $request,
        CompanyLocation $location,
    ): JsonResponse {
        $company = $this->tenantCompany($request);

        if ((string) $location->company_id !== $this->tenantCompanyId($request)) {
            abort(404);
        }

        /** @phpstan-ignore-next-line */
        $this->authorize('manageAccountLocations', $company);

        $validated = $request->validated();
        $makeDefault = array_key_exists('is_default', $validated) && $validated['is_default'] === true;
        unset($validated['is_default']);

        if ($validated !== []) {
            $location->update($validated);
        }

        if ($makeDefault) {
            $this->setAsOnlyDefault($company, $location->fresh());
        }

        /** @phpstan-ignore-next-line */
        return ApiResponses::success($this->locationPayload($location->fresh()));
    }

    /** @return array<string, mixed> */
    private function locationPayload(CompanyLocation $l): array
    {
        return [
            'id' => (string) $l->id,
            'label' => $l->label,
            'is_default' => (bool) $l->is_default,
            'line_one' => $l->line_one,
            'line_two' => $l->line_two,
            'city' => $l->city,
            'postcode' => $l->postcode,
            'country' => $l->country,
            'latitude' => $l->latitude,
            'longitude' => $l->longitude,
            'updated_at' => $l->updated_at?->toIso8601String(),
        ];
    }

    private function setAsOnlyDefault(Company $company, CompanyLocation $location): void
    {
        CompanyLocation::query()
            ->where('company_id', $company->id)
            ->whereKeyNot($location->id)
            ->update(['is_default' => false]);

        $location->forceFill(['is_default' => true])->save();
    }
}
