<?php

namespace App\Actions\Locations;

use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;

final class UpdateCompanyLocationAction
{
    /** @param  array<string, mixed>  $validated */
    public function handle(User $user, Company $company, CompanyLocation $location, array $validated, Request $request): CompanyLocation
    {
        if ($location->isArchived()) {
            abort(422, 'Archived locations cannot be edited. Restore the location first.');
        }

        $before = $location->only(array_keys($validated));
        $location->fill($validated);

        if ($location->isDirty()) {
            $location->save();
            AuditRecorder::record($user, $company, 'company.location_updated', [
                'location_id' => (string) $location->id,
                'before' => $before,
                'after' => $location->only(array_keys($validated)),
            ], $request);
        }

        return $location->fresh();
    }
}
