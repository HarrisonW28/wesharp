<?php

namespace App\Actions\Contacts;

use App\Models\Company;
use App\Models\Contact;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class RestoreCompanyContactAction
{
    public function handle(User $user, Company $company, Contact $contact, Request $request): Contact
    {
        if (! $contact->isArchived()) {
            return $contact;
        }

        return DB::transaction(function () use ($user, $company, $contact, $request): Contact {
            $contact->archived_at = null;
            $contact->save();

            AuditRecorder::record($user, $company, 'company.contact_restored', [
                'contact_id' => (string) $contact->id,
            ], $request);

            return $contact->fresh();
        });
    }
}
