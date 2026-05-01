<?php

namespace App\Policies;

use App\Models\DamageReport;
use App\Models\User;
use App\Support\Permissions;

final class DamageReportPolicy
{
    public function update(User $user, DamageReport $report): bool
    {
        $report->loadMissing('knife');

        if ($report->knife === null) {
            return false;
        }

        return Permissions::userMayForCompany($user, Permissions::KNIVES_UPDATE, $report->knife->company_id);
    }
}
