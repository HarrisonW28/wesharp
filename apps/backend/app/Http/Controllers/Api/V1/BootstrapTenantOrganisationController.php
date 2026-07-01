<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\CompanyStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\BootstrapTenantOrganisationRequest;
use App\Models\Company;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Services\Crm\CompanyLeadResolver;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class BootstrapTenantOrganisationController extends Controller
{
    public function __construct(
        private readonly CompanyLeadResolver $leadResolver,
    ) {}

    /** First portal sign-in when no Laravel company binding exists yet. */
    public function store(BootstrapTenantOrganisationRequest $request): JsonResponse
    {
        /** @phpstan-ignore-next-line */
        $actor = $request->user();

        /** @phpstan-ignore-next-line */
        if ($actor === null) {
            return ApiResponses::unauthorized();
        }

        $role = $actor->resolvedRole();

        if (! $role->isCustomer()) {
            return ApiResponses::forbidden('Only customer accounts may register an organisation via this endpoint.');
        }

        /** @phpstan-ignore-next-line */
        if ($actor->company_id !== null) {
            return ApiResponses::error(
                'Your account already has a linked organisation.',
                'organisation_already_linked',
                JsonResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $validated = $request->validated();
        $registrationType = $request->registrationType();

        /** @phpstan-ignore-next-line */
        $billingEmail = $validated['billing_email'] ?? null;
        if ($billingEmail === null || trim((string) $billingEmail) === '') {
            /** @phpstan-ignore-next-line */
            $billingEmail = (string) $actor->email;
        }

        try {
            $company = DB::transaction(function () use ($request, $actor, $validated, $billingEmail, $registrationType): Company {
                /** @phpstan-ignore-next-line */
                $locked = User::query()->lockForUpdate()->findOrFail($actor->getKey());

                if (! $locked->resolvedRole()->isCustomer()) {
                    abort(403, 'Account type mismatch.');
                }

                /** @phpstan-ignore-next-line */
                if ($locked->company_id !== null) {
                    abort(409, 'Account state changed.');
                }

                /** @phpstan-ignore-next-line */
                $trimName = trim((string) $validated['name']);
                /** @phpstan-ignore-next-line */
                $isSole = $registrationType === 'sole_customer';

                /** @phpstan-ignore-next-line */
                $baseSlug = Str::slug($trimName) !== ''
                    /** @phpstan-ignore-next-line */
                    ? (($isSole ? 'solo-' : '').Str::slug($trimName))
                    /** @phpstan-ignore-next-line */
                    : ($isSole ? 'sole-customer' : 'organisation');

                $candidate = $baseSlug;

                /** @phpstan-ignore-next-line */
                for ($attempt = 0; $attempt < 32; ++$attempt) {
                    if ($attempt > 0) {
                        /** @phpstan-ignore-next-line */
                        $candidate = $baseSlug.'-'.Str::lower(Str::random(4));
                    }
                    if (! Company::query()->where('slug', $candidate)->exists()) {
                        break;
                    }
                }

                /** @phpstan-ignore-next-line */
                $city = isset($validated['city']) ? trim((string) $validated['city']) : '';
                /** @phpstan-ignore-next-line */
                $phone = isset($validated['phone']) ? trim((string) $validated['phone']) : '';
                $emailNorm = strtolower(trim((string) $billingEmail));

                $existingLead = $this->leadResolver->findByEmail($emailNorm);

                if ($existingLead instanceof Company) {
                    if ($isSole && $existingLead->company_status === CompanyStatus::Lead) {
                        $existingLead->is_sole_customer = true;
                        if ($trimName !== '') {
                            $existingLead->name = $trimName;
                        }
                        $existingLead->save();
                    }

                    /** @phpstan-ignore-next-line */
                    $locked->company_id = $existingLead->id;
                    /** @phpstan-ignore-next-line */
                    $locked->save();

                    AuditRecorder::record($locked, $existingLead, 'company.matched_existing_lead', [
                        'via' => 'tenant_portal_bootstrap',
                        /** @phpstan-ignore-next-line */
                        'registration_type' => $registrationType,
                    ], $request);

                    AuditRecorder::record($locked, $locked->refresh(), 'user.company_attached_via_portal', [
                        /** @phpstan-ignore-next-line */
                        'company_id' => (string) $existingLead->id,
                        'matched_existing_lead' => true,
                    ], $request);

                    return $existingLead;
                }

                $companyModel = Company::query()->create([
                    /** @phpstan-ignore-next-line */
                    'name' => $trimName,
                    /** @phpstan-ignore-next-line */
                    'slug' => $candidate,
                    'company_status' => CompanyStatus::Lead,
                    /** @phpstan-ignore-next-line */
                    'is_sole_customer' => $isSole,
                    'phone' => $phone !== '' ? $phone : null,
                    'billing_email' => strtolower(trim((string) $billingEmail)),
                    'city' => $city !== '' ? $city : null,
                ]);

                /** @phpstan-ignore-next-line */
                $locked->company_id = $companyModel->id;
                /** @phpstan-ignore-next-line */
                $locked->save();

                AuditRecorder::record($locked, $companyModel, 'company.self_registered', [
                    'via' => 'tenant_portal_bootstrap',
                    /** @phpstan-ignore-next-line */
                    'registration_type' => $registrationType,
                ], $request);

                AuditRecorder::record($locked, $locked->refresh(), 'user.company_attached_via_portal', [
                    /** @phpstan-ignore-next-line */
                    'company_id' => (string) $companyModel->id,
                ], $request);

                return $companyModel;
            });
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $status = $e->getStatusCode();

            return ApiResponses::error(
                /** @phpstan-ignore-next-line */
                $e->getMessage() !== '' ? $e->getMessage() : 'Conflict.',
                $status === JsonResponse::HTTP_CONFLICT ? 'conflict' : 'forbidden',
                $status,
            );
        }

        /** @phpstan-ignore-next-line */
        $isSole = $company->is_sole_customer;
        /** @phpstan-ignore-next-line */
        $message = $isSole
            ? 'Individual profile saved. Add a pickup address under Locations when you are ready to schedule collections.'
            : 'Organisation created. Add a pickup address under Locations to schedule collections.';

        /** @phpstan-ignore-next-line */
        return ApiResponses::success([
            'company' => [
                /** @phpstan-ignore-next-line */
                'id' => (string) $company->id,
                /** @phpstan-ignore-next-line */
                'name' => $company->name,
                /** @phpstan-ignore-next-line */
                'slug' => $company->slug,
                /** @phpstan-ignore-next-line */
                'company_status' => $company->company_status?->value,
                /** @phpstan-ignore-next-line */
                'is_sole_customer' => $isSole,
            ],
            'message' => $message,
        ], JsonResponse::HTTP_CREATED);
    }
}
