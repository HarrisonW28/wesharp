<?php

namespace App\Actions\Locations;

use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class SetDefaultCompanyLocationAction
{
    public function handle(User $user, Company $company, CompanyLocation $location, Request $request): CompanyLocation
    {
        if ($location->isArchived()) {
            abort(422, 'Cannot set an archived location as the default service site.');
        }

        return DB::transaction(function () use ($user, $company, $location, $request): CompanyLocation {
            $previous = CompanyLocation::query()
                ->where('company_id', $company->id)
                ->active()
                ->where('is_default', true)
                ->whereKeyNot($location->id)
                ->first();

            CompanyLocation::query()
                ->where('company_id', $company->id)
                ->active()
                ->update(['is_default' => false]);

            $location->is_default = true;
            $location->save();

            AuditRecorder::record($user, $company, 'company.location_default_set', [
                'location_id' => (string) $location->id,
                'previous_location_id' => $previous ? (string) $previous->id : null,
            ], $request);

            return $location->fresh();
        });
    }
}
