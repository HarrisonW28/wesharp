<?php

namespace App\Policies;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\User;
use App\Support\Permissions;

final class InvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::INVOICES_VIEW);
    }

    public function view(User $user, Invoice $invoice): bool
    {
        if (! Permissions::userMayForCompany($user, Permissions::INVOICES_VIEW, (string) $invoice->company_id)) {
            return false;
        }

        if ($user->resolvedRole()->isCustomer() && $invoice->invoice_status === InvoiceStatus::Draft) {
            return false;
        }

        return true;
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::INVOICES_CREATE);
    }

    public function update(User $user, Invoice $invoice): bool
    {
        return Permissions::userMayForCompany($user, Permissions::INVOICES_UPDATE, (string) $invoice->company_id);
    }

    public function send(User $user, Invoice $invoice): bool
    {
        return Permissions::userMayForCompany($user, Permissions::INVOICES_UPDATE, (string) $invoice->company_id);
    }

    public function markPaid(User $user, Invoice $invoice): bool
    {
        return Permissions::userMayForCompany($user, Permissions::INVOICES_UPDATE, (string) $invoice->company_id)
            && Permissions::userMayForCompany($user, Permissions::PAYMENTS_MANAGE, (string) $invoice->company_id);
    }

    public function voidInvoice(User $user, Invoice $invoice): bool
    {
        return Permissions::userMayForCompany($user, Permissions::INVOICES_UPDATE, (string) $invoice->company_id);
    }

    /** Undo “mark sent” when no payments exist — finance correction. */
    public function reopenDraft(User $user, Invoice $invoice): bool
    {
        return Permissions::userMayForCompany($user, Permissions::INVOICES_UPDATE, (string) $invoice->company_id);
    }

    /** Bank transfer entry — restricted to PAYMENTS_MANAGE + invoice visibility scope. */
    public function recordManualPayment(User $user, Invoice $invoice): bool
    {
        return Permissions::userMay($user, Permissions::PAYMENTS_MANAGE)
            && Permissions::userMayForCompany($user, Permissions::INVOICES_VIEW, (string) $invoice->company_id);
    }
}
