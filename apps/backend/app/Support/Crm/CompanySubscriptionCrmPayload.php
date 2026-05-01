<?php

declare(strict_types=1);

namespace App\Support\Crm;

use App\Enums\InvoiceStatus;
use App\Enums\UserRole;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Contact;
use App\Models\Invoice;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\Money\MoneyFormatting;
use App\Support\Permissions;
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
        $canManage = Permissions::userMay($viewer, Permissions::SUBSCRIPTIONS_MANAGE) && ! $routeManager;
        $canViewSubscriptions = Permissions::userMay($viewer, Permissions::SUBSCRIPTIONS_VIEW);

        $company->loadMissing([
            'subscription.plan',
            'subscription.billingContact',
            'subscriptions.plan',
            'subscriptions.billingContact',
        ]);

        $sub = $company->relationLoaded('subscription')
            ? $company->subscription
            : $company->subscription()->with(['plan', 'billingContact'])->first();

        if ($sub instanceof CompanySubscription) {
            $sub->loadMissing(['plan', 'billingContact']);
        }

        $history = $canViewSubscriptions ? self::historyRows($company, $routeManager) : [];

        $hasActive = $sub instanceof CompanySubscription;
        $hasPrior = $company->subscriptions->isNotEmpty();

        if (! $hasActive) {
            return [
                'state' => 'none',
                'headline' => 'No active subscription',
                'subheadline' => $hasPrior
                    ? 'This company has subscription history but nothing active right now.'
                    : 'Assign a plan to start subscription billing for this account.',
                'plan_management_available' => $canManage,
                'recurring_amount_pence' => null,
                'recurring_amount_note' => 'Recurring amounts use the price snapshot stored on each subscription row.',
                'crm_actions' => self::crmActions($canManage, false, $hasPrior),
                'subscription_history' => $history,
                'billing_visibility' => $routeManager ? 'route_manager_limited' : 'full',
                'billing_restricted_message' => $routeManager
                    ? 'Billing contact, subscription invoices, and balances are hidden for route managers.'
                    : null,
            ];
        }

        $snapshot = (int) $sub->price_amount_minor_snapshot;
        $plan = $sub->plan;

        $core = [
            'state' => 'record',
            'headline' => $plan !== null ? $plan->name : 'Subscription',
            'id' => (string) $sub->id,
            'subscription_plan_id' => (string) $sub->subscription_plan_id,
            'plan_name' => $plan !== null ? $plan->name : 'Plan',
            'status' => $sub->status?->value ?? (string) $sub->status,
            'status_label' => Str::headline(str_replace('_', ' ', $sub->status?->value ?? (string) $sub->status)),
            'starts_at' => $sub->starts_at?->format('Y-m-d'),
            'renews_at' => $sub->renews_at?->format('Y-m-d'),
            'cancelled_at' => $sub->cancelled_at?->format('Y-m-d'),
            'current_period_end' => $sub->renews_at?->format('Y-m-d'),
            'notes' => $sub->notes,
            'allowance_summary' => self::allowanceSummaryFromPlan($plan),
            'included_services' => $plan?->description,
            'price_amount_minor_snapshot' => $snapshot,
            'formatted_price_snapshot_gbp' => strtoupper((string) $sub->currency) === 'GBP'
                ? MoneyFormatting::formatGbpFromPence($snapshot)
                : null,
            'currency' => (string) $sub->currency,
            'plan_management_available' => $canManage,
            'recurring_amount_pence' => $snapshot > 0 ? $snapshot : null,
            'recurring_amount_note' => $snapshot > 0
                ? 'Snapshot in minor units at assignment; invoices may differ after discounts or plan changes.'
                : 'No price snapshot on this row (legacy migration or draft).',
            'crm_actions' => self::crmActions($canManage, true, $hasPrior),
            'subscription_history' => $history,
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
            'billing_contact' => self::resolveBillingContactForPanel($company, $sub),
            'billing_contact_id' => $sub->billing_contact_id !== null ? (string) $sub->billing_contact_id : null,
            'latest_subscription_invoice' => self::latestSubscriptionInvoice($company->id),
            'outstanding_subscription_invoices_pence' => $outstanding,
            'formatted_outstanding_subscription' => MoneyFormatting::formatGbpFromPence($outstanding),
        ]);
    }

    /** @return list<array<string, mixed>> */
    private static function historyRows(Company $company, bool $routeManager): array
    {
        $rows = [];
        foreach ($company->subscriptions as $hist) {
            if (! $hist instanceof CompanySubscription) {
                continue;
            }
            $hist->loadMissing('plan', 'billingContact');
            $p = $hist->plan;
            $row = [
                'id' => (string) $hist->id,
                'plan_name' => $p !== null ? $p->name : 'Plan',
                'status' => $hist->status?->value ?? (string) $hist->status,
                'status_label' => Str::headline(str_replace('_', ' ', $hist->status?->value ?? '')),
                'starts_at' => $hist->starts_at?->format('Y-m-d'),
                'renews_at' => $hist->renews_at?->format('Y-m-d'),
                'cancelled_at' => $hist->cancelled_at?->format('Y-m-d'),
            ];
            if (! $routeManager) {
                $snap = (int) $hist->price_amount_minor_snapshot;
                $row['price_amount_minor_snapshot'] = $snap;
                $row['formatted_price_snapshot_gbp'] = strtoupper((string) $hist->currency) === 'GBP'
                    ? MoneyFormatting::formatGbpFromPence($snap)
                    : null;
                $row['currency'] = (string) $hist->currency;
                $row['billing_contact'] = self::contactBrief($hist->billingContact);
            }
            $rows[] = $row;
        }

        return $rows;
    }

    /** @return array<string, mixed> */
    private static function contactBrief(?Contact $contact): ?array
    {
        if ($contact === null) {
            return null;
        }

        $name = trim($contact->first_name.' '.$contact->last_name);

        return [
            'id' => (string) $contact->id,
            'name' => $name !== '' ? $name : null,
            'email' => $contact->email,
            'phone' => $contact->phone,
        ];
    }

    /**
     * Prefer the subscription row's billing contact; fall back to company primary billing contact.
     *
     * @return array<string, mixed>|null
     */
    private static function resolveBillingContactForPanel(Company $company, CompanySubscription $sub): ?array
    {
        $fromSub = self::contactBrief($sub->billingContact);
        if ($fromSub !== null) {
            return $fromSub;
        }

        return self::billingContactFromCompany($company);
    }

    /** @return array<string, mixed>|null */
    private static function billingContactFromCompany(Company $company): ?array
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

    /** @return list<array{id: string, label: string, available: bool, hint: string}> */
    private static function crmActions(bool $canManage, bool $hasActive, bool $hasPrior): array
    {
        if (! $canManage) {
            $deny = 'Requires subscriptions.manage (not available to route managers).';

            return [
                ['id' => 'assign_plan', 'label' => 'Assign plan', 'available' => false, 'hint' => $deny],
                ['id' => 'change_plan', 'label' => 'Change plan', 'available' => false, 'hint' => $deny],
                ['id' => 'cancel_subscription', 'label' => 'Cancel subscription', 'available' => false, 'hint' => $deny],
                ['id' => 'reactivate_subscription', 'label' => 'Reactivate', 'available' => false, 'hint' => $deny],
                ['id' => 'view_subscription_invoices', 'label' => 'View subscription invoices', 'available' => false, 'hint' => $deny],
            ];
        }

        return [
            [
                'id' => 'assign_plan',
                'label' => 'Assign plan',
                'available' => ! $hasActive,
                'hint' => $hasActive ? 'An active subscription already exists — change plan or cancel first.' : '',
            ],
            [
                'id' => 'change_plan',
                'label' => 'Change plan',
                'available' => $hasActive,
                'hint' => $hasActive ? '' : 'No active subscription to change.',
            ],
            [
                'id' => 'cancel_subscription',
                'label' => 'Cancel subscription',
                'available' => $hasActive,
                'hint' => $hasActive ? '' : 'No active subscription to cancel.',
            ],
            [
                'id' => 'reactivate_subscription',
                'label' => 'Reactivate',
                'available' => ! $hasActive && $hasPrior,
                'hint' => (! $hasActive && $hasPrior) ? '' : 'Reactivate after a cancellation using the prior plan or pick a plan explicitly.',
            ],
            [
                'id' => 'view_subscription_invoices',
                'label' => 'View subscription invoices',
                'available' => true,
                'hint' => '',
            ],
        ];
    }

    private static function allowanceSummaryFromPlan(?SubscriptionPlan $plan): ?string
    {
        if ($plan === null) {
            return null;
        }

        $parts = [];
        if ($plan->included_collections !== null) {
            $parts[] = $plan->included_collections.' collection visit(s) included';
        }
        if ($plan->included_knife_allowance !== null) {
            $parts[] = $plan->included_knife_allowance.' knife allowance';
        }

        return $parts === [] ? null : implode('; ', $parts);
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
