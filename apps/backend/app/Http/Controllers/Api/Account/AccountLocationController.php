<?php

namespace App\Http\Controllers\Api\Account;

use App\Http\Requests\Account\AccountStoreCompanyLocationRequest;
use App\Http\Requests\Account\AccountUpdateCompanyLocationRequest;
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
            ->orderBy('label')
            ->get()
            ->map(static fn (CompanyLocation $l): array => [
                'id' => (string) $l->id,
                'label' => $l->label,
                'line_one' => $l->line_one,
                'line_two' => $l->line_two,
                'city' => $l->city,
                'postcode' => $l->postcode,
                'country' => $l->country,
                'latitude' => $l->latitude,
                'longitude' => $l->longitude,
                'updated_at' => $l->updated_at?->toIso8601String(),
            ])
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

        /** @phpstan-ignore-next-line */
        $location = CompanyLocation::query()->create(array_merge($validated, [
            'company_id' => (string) $company->getKey(),
        ]));

        return ApiResponses::success([
            'id' => (string) $location->id,
            'label' => $location->label,
            'line_one' => $location->line_one,
            'line_two' => $location->line_two,
            'city' => $location->city,
            'postcode' => $location->postcode,
            'country' => $location->country,
            'latitude' => $location->latitude,
            'longitude' => $location->longitude,
        ], 201);
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

        $location->update($request->validated());

        return ApiResponses::success([
            'id' => (string) $location->id,
            'label' => $location->label,
            'line_one' => $location->line_one,
            'line_two' => $location->line_two,
            'city' => $location->city,
            'postcode' => $location->postcode,
            'country' => $location->country,
            'latitude' => $location->latitude,
            'longitude' => $location->longitude,
            'updated_at' => $location->updated_at?->toIso8601String(),
        ]);
    }
}
