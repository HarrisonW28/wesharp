<?php

declare(strict_types=1);

namespace App\Support\Crm;

use App\Enums\InvoiceStatus;
use App\Enums\UserRole;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Contact;
use App\Models\Invoice;
use App\Models\User;
use App\Support\Money\MoneyFormatting;
use Illuminate\Support\Str;

/**
 * Admin CRM subscription panel — real DB fields only, no fabricated MRR/ARR.
 * Route managers receive a reduced payload (no billing contact, invoice amounts, or AR totals).
 */
final class CompanySubscriptionCrmPayload
{
    /**
     * @return array<string, mixed>
     */
    public static function build(Company $company, User $viewer): array
    {
        $role = $viewer->resolvedRole();
        $routeManager = $role === UserRole::RouteManager;

        $sub = $company->relationLoaded('subscription')
            ? $company->subscription
            : $company->subscription()->first();

        $actions = self::stubActions();

        if (! $sub instanceof CompanySubscription) {
            return [
                'state' => 'none',
                'headline' => 'No active subscription',
                'subheadline' => 'There is no `company_subscriptions` row for this account yet. Sprint 9 will wire plan assignment, renewals, and commercial fields.',
                'plan_management_available' => false,
                'recurring_amount_pence' => null,
                'recurring_amount_note' => 'Recurring contract value (MRR/ARR) is not stored in the database yet — Sprint 9.',
                'crm_actions' => $actions,
            ];
        }

        $core = [
            'state' => 'record',
            'headline' => $sub->plan_name,
            'id' => (string) $sub->id,
            'plan_name' => $sub->plan_name,
            'status' => $sub->status,
            'status_label' => Str::headline(str_replace('_', ' ', $sub->status)),
            'current_period_end' => $sub->current_period_end?->format('Y-m-d'),
            'allowance_summary' => $sub->allowance_summary,
            'included_services' => $sub->included_services,
            'plan_management_available' => false,
            'recurring_amount_pence' => null,
            'recurring_amount_note' => 'No MRR/ARR column on `company_subscriptions` — Sprint 9 will define commercial pricing fields.',
            'crm_actions' => $actions,
        ];

        if ($routeManager) {
            return array_merge($core, [
                'billing_visibility' => 'route_manager_limited',
                'billing_restricted_message' => 'Billing contact, subscription invoices, and balances are hidden for route managers.',
            ]);
        }

        $outstanding = self::outstandingSubscriptionInvoicesPence($company->id);

        return array_merge($core, [
            'billing_visibility' => 'full',
            'billing_contact' => self::billingContact($company),
            'latest_subscription_invoice' => self::latestSubscriptionInvoice($company->id),
            'outstanding_subscription_invoices_pence' => $outstanding,
            'formatted_outstanding_subscription' => MoneyFormatting::formatGbpFromPence($outstanding),
        ]);
    }

    /** @return list<array<string, mixed>> */
    private static function stubActions(): array
    {
        $hint = 'Planned in Sprint 9 — requires subscription service & policies.';

        return [
            ['id' => 'assign_plan', 'label' => 'Assign plan', 'available' => false, 'hint' => $hint],
            ['id' => 'change_plan', 'label' => 'Change plan', 'available' => false, 'hint' => $hint],
            ['id' => 'cancel_subscription', 'label' => 'Cancel subscription', 'available' => false, 'hint' => $hint],
            ['id' => 'view_subscription_invoices', 'label' => 'View subscription invoices', 'available' => false, 'hint' => $hint],
        ];
    }

    /** @return array<string, mixed>|null */
    private static function billingContact(Company $company): ?array
    {
        $email = $company->billing_email;
        $name = null;
        $phone = null;

        if ($company->relationLoaded('contacts')) {
            /** @var Contact|null $primary */
            $primary = $company->contacts
                ->filter(static fn (Contact $c) => ! $c->isArchived() && $c->billing_contact)
                ->sortBy(fn (Contact $c) => $c->last_name.$c->first_name)
                ->first();

            if ($primary instanceof Contact) {
                $name = trim($primary->first_name.' '.$primary->last_name);
                if ($name === '') {
                    $name = 'Billing contact';
                }
                $email = $primary->email ?? $email;
                $phone = $primary->phone;
            }
        }

        if (($email === null || $email === '') && $name === null) {
            return null;
        }

        return [
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
        ];
    }

    /** @return array<string, mixed>|null */
    private static function latestSubscriptionInvoice(string $companyId): ?array
    {
        $inv = Invoice::query()
            ->where('company_id', $companyId)
            ->where('is_subscription_billing', true)
            ->orderByDesc('issued_on')
            ->orderByDesc('created_at')
            ->first();

        if (! $inv instanceof Invoice) {
            return null;
        }

        $total = (int) $inv->total_pence;

        return [
            'id' => (string) $inv->id,
            'invoice_number' => $inv->invoice_number,
            'invoice_status' => $inv->invoice_status?->value,
            'invoice_status_label' => $inv->invoice_status !== null
                ? Str::headline(str_replace('_', ' ', $inv->invoice_status->value))
                : null,
            'issued_on' => $inv->issued_on?->format('Y-m-d'),
            'total_pence' => $total,
            'formatted_total' => MoneyFormatting::formatGbpFromPence($total),
        ];
    }

    private static function outstandingSubscriptionInvoicesPence(string $companyId): int
    {
        $invoices = Invoice::query()
            ->where('company_id', $companyId)
            ->where('is_subscription_billing', true)
            ->whereNotIn('invoice_status', [InvoiceStatus::Paid, InvoiceStatus::Void])
            ->with('payments:id,invoice_id,amount_pence')
            ->get();

        $sum = 0;
        foreach ($invoices as $invoice) {
            $total = (int) $invoice->total_pence;
            $received = (int) $invoice->payments->sum(fn ($p) => (int) $p->amount_pence);
            $sum += max(0, $total - $received);
        }

        return $sum;
    }
}
