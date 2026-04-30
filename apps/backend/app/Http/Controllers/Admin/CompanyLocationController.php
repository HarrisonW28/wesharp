<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Locations\ArchiveCompanyLocationAction;
use App\Actions\Locations\RestoreCompanyLocationAction;
use App\Actions\Locations\SetDefaultCompanyLocationAction;
use App\Actions\Locations\UpdateCompanyLocationAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCompanyLocationAdminRequest;
use App\Http\Resources\CrmLocationResource;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CompanyLocationController extends Controller
{
    public function update(
        UpdateCompanyLocationAdminRequest $request,
        Company $company,
        CompanyLocation $location,
        UpdateCompanyLocationAction $action,
    ): JsonResponse {
        $this->authorize('update', $company);
        $this->assertSameCompany($company, $location);

        $updated = $action->handle($request->user(), $company, $location, $request->validated(), $request);

        return ApiResponses::success((new CrmLocationResource($updated))->resolve());
    }

    public function archive(
        Request $request,
        Company $company,
        CompanyLocation $location,
        ArchiveCompanyLocationAction $action,
    ): JsonResponse {
        $this->authorize('update', $company);
        $this->assertSameCompany($company, $location);

        $archived = $action->handle($request->user(), $company, $location, $request);

        return ApiResponses::success((new CrmLocationResource($archived))->resolve());
    }

    public function restore(
        Request $request,
        Company $company,
        CompanyLocation $location,
        RestoreCompanyLocationAction $action,
    ): JsonResponse {
        $this->authorize('update', $company);
        $this->assertSameCompany($company, $location);

        $restored = $action->handle($request->user(), $company, $location, $request);

        return ApiResponses::success((new CrmLocationResource($restored))->resolve());
    }

    public function setDefault(
        Request $request,
        Company $company,
        CompanyLocation $location,
        SetDefaultCompanyLocationAction $action,
    ): JsonResponse {
        $this->authorize('update', $company);
        $this->assertSameCompany($company, $location);

        $def = $action->handle($request->user(), $company, $location, $request);

        return ApiResponses::success((new CrmLocationResource($def))->resolve());
    }

    private function assertSameCompany(Company $company, CompanyLocation $location): void
    {
        abort_unless((string) $location->company_id === (string) $company->id, 404);
    }
}
