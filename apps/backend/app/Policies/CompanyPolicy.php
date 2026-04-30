<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;
use App\Support\Permissions;

final class CompanyPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::COMPANIES_VIEW);
    }

    public function view(User $user, Company $company): bool
    {
        return Permissions::userMayForCompany($user, Permissions::COMPANIES_VIEW, $company->id);
    }

    public function update(User $user, Company $company): bool
    {
        return Permissions::userMayForCompany($user, Permissions::COMPANIES_UPDATE, $company->id);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::COMPANIES_CREATE);
    }

    public function delete(User $user, Company $company): bool
    {
        return Permissions::userMayForCompany($user, Permissions::COMPANIES_DELETE, $company->id);
    }

    /**
     * Pick-up/site addresses for tenant companies (portal) — excludes billing ledgers / internal CRM edits.
     */
    public function manageAccountLocations(User $user, Company $company): bool
    {
        return Permissions::userMayForCompany($user, Permissions::ACCOUNT_LOCATIONS_MANAGE, $company->id);
    }

    /** Trading / billing contact fields on the tenant company (portal — owner only). */
    public function updateTenantProfile(User $user, Company $company): bool
    {
        return Permissions::userMayForCompany($user, Permissions::ACCOUNT_BUSINESS_UPDATE, $company->id);
    }
}
