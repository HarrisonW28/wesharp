<?php

namespace App\Actions\Contacts;

use App\Models\Company;
use App\Models\Contact;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ArchiveCompanyContactAction
{
    public function handle(User $user, Company $company, Contact $contact, Request $request): Contact
    {
        if ($contact->isArchived()) {
            return $contact;
        }

        return DB::transaction(function () use ($user, $company, $contact, $request): Contact {
            $wasPrimary = (bool) $contact->billing_contact;
            $contact->billing_contact = false;
            $contact->archived_at = now();
            $contact->save();

            AuditRecorder::record($user, $company, 'company.contact_archived', [
                'contact_id' => (string) $contact->id,
                'was_primary_billing' => $wasPrimary,
                'summary' => \App\Http\Resources\CrmContactResource::auditSummary($contact),
            ], $request);

            return $contact->fresh();
        });
    }
}
