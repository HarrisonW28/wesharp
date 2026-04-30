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
}
