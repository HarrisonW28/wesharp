<?php

namespace App\Actions\Contacts;

use App\Models\Company;
use App\Models\Contact;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;

final class UpdateCompanyContactAction
{
    /** @param  array<string, mixed>  $validated */
    public function handle(User $user, Company $company, Contact $contact, array $validated, Request $request): Contact
    {
        if ($contact->isArchived()) {
            abort(422, 'Archived contacts cannot be edited. Restore the contact first.');
        }

        $before = $contact->only(array_keys($validated));
        $contact->fill($validated);

        if ($contact->isDirty()) {
            $contact->save();
            AuditRecorder::record($user, $company, 'company.contact_updated', [
                'contact_id' => (string) $contact->id,
                'before' => $before,
                'after' => $contact->only(array_keys($validated)),
            ], $request);
        }

        return $contact->fresh();
    }
}
