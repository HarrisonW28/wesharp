<?php

namespace App\Actions\Contacts;

use App\Models\Company;
use App\Models\Contact;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class SetPrimaryBillingContactAction
{
    public function handle(User $user, Company $company, Contact $contact, Request $request): Contact
    {
        if ($contact->isArchived()) {
            abort(422, 'Cannot set an archived contact as primary billing contact.');
        }

        return DB::transaction(function () use ($user, $company, $contact, $request): Contact {
            $previous = Contact::query()
                ->where('company_id', $company->id)
                ->where('billing_contact', true)
                ->whereKeyNot($contact->id)
                ->first();

            Contact::query()
                ->where('company_id', $company->id)
                ->whereNull('archived_at')
                ->update(['billing_contact' => false]);

            $contact->billing_contact = true;
            $contact->save();

            AuditRecorder::record($user, $company, 'company.contact_primary_set', [
                'contact_id' => (string) $contact->id,
                'previous_contact_id' => $previous ? (string) $previous->id : null,
            ], $request);

            return $contact->fresh();
        });
    }
}
