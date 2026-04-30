<?php

namespace App\Actions\Locations;

use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ArchiveCompanyLocationAction
{
    public function handle(User $user, Company $company, CompanyLocation $location, Request $request): CompanyLocation
    {
        if ($location->isArchived()) {
            return $location;
        }

        return DB::transaction(function () use ($user, $company, $location, $request): CompanyLocation {
            $wasDefault = (bool) $location->is_default;
            $location->is_default = false;
            $location->archived_at = now();
            $location->save();

            $promotedId = null;
            if ($wasDefault) {
                $next = CompanyLocation::query()
                    ->where('company_id', $company->id)
                    ->active()
                    ->orderBy('label')
                    ->first();

                if ($next !== null) {
                    CompanyLocation::query()
                        ->where('company_id', $company->id)
                        ->active()
                        ->update(['is_default' => false]);
                    $next->is_default = true;
                    $next->save();
                    $promotedId = (string) $next->id;

                    AuditRecorder::record($user, $company, 'company.location_default_changed', [
                        'reason' => 'previous_default_archived',
                        'location_id' => $promotedId,
                    ], $request);
                }
            }

            AuditRecorder::record($user, $company, 'company.location_archived', [
                'location_id' => (string) $location->id,
                'label' => $location->label,
                'was_default' => $wasDefault,
                'promoted_location_id' => $promotedId,
            ], $request);

            return $location->fresh();
        });
    }
}
