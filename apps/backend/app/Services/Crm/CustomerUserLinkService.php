<?php

declare(strict_types=1);

namespace App\Services\Crm;

/**
 * Placeholder for programmatic customer onboarding (Clerk invitations, magic links, SSO handoff).
 *
 * Future phase: call Clerk's invitation API with service account credentials, persist invite state,
 * map email → company/contact, and hydrate `users` + `clerk_user_id` via webhooks/sync.
 *
 * MVP callers should use Admin user directory + backend user provisioning only — do not ship invite
 * secrets to browsers.
 */
final class CustomerUserLinkService
{
    /**
     * Resolve or create an application user tied to a CRM company by email (no Clerk invite yet).
     *
     * @return array<string, mixed> Placeholder contract for the full implementation.
     */
    public function proposeLinkByEmail(string $email, string $companyId, ?string $contactId = null): array
    {
        return [
            'status' => 'not_implemented',
            'message' => 'Use Admin user directory APIs to assign customer roles and Clerk sync for now.',
            'email' => $email,
            'company_id' => $companyId,
            'contact_id' => $contactId,
        ];
    }
}
