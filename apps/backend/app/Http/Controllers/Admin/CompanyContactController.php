<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Contacts\ArchiveCompanyContactAction;
use App\Actions\Contacts\RestoreCompanyContactAction;
use App\Actions\Contacts\SetPrimaryBillingContactAction;
use App\Actions\Contacts\UpdateCompanyContactAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateContactRequest;
use App\Http\Resources\CrmContactResource;
use App\Models\Company;
use App\Models\Contact;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CompanyContactController extends Controller
{
    public function update(
        UpdateContactRequest $request,
        Company $company,
        Contact $contact,
        UpdateCompanyContactAction $action,
    ): JsonResponse {
        $this->authorize('update', $company);
        $this->assertSameCompany($company, $contact);

        $updated = $action->handle($request->user(), $company, $contact, $request->validated(), $request);

        return ApiResponses::success((new CrmContactResource($updated))->resolve());
    }

    public function archive(
        Request $request,
        Company $company,
        Contact $contact,
        ArchiveCompanyContactAction $action,
    ): JsonResponse {
        $this->authorize('update', $company);
        $this->assertSameCompany($company, $contact);

        $archived = $action->handle($request->user(), $company, $contact, $request);

        return ApiResponses::success((new CrmContactResource($archived))->resolve());
    }

    public function restore(
        Request $request,
        Company $company,
        Contact $contact,
        RestoreCompanyContactAction $action,
    ): JsonResponse {
        $this->authorize('update', $company);
        $this->assertSameCompany($company, $contact);

        $restored = $action->handle($request->user(), $company, $contact, $request);

        return ApiResponses::success((new CrmContactResource($restored))->resolve());
    }

    public function setPrimary(
        Request $request,
        Company $company,
        Contact $contact,
        SetPrimaryBillingContactAction $action,
    ): JsonResponse {
        $this->authorize('update', $company);
        $this->assertSameCompany($company, $contact);

        $primary = $action->handle($request->user(), $company, $contact, $request);

        return ApiResponses::success((new CrmContactResource($primary))->resolve());
    }

    private function assertSameCompany(Company $company, Contact $contact): void
    {
        abort_unless((string) $contact->company_id === (string) $company->id, 404);
    }
}
