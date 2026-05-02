<?php

namespace App\Support\Account;

use App\Enums\SubscriptionStatus;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\SubscriptionPlan;
use App\Services\Subscriptions\OrderSubscriptionCoverageService;
use App\Services\Subscriptions\SubscriptionBillingPeriodService;
use App\Support\Invoices\InvoiceJson;
use App\Support\Portal\CustomerActivityTimelinePresenter;
use App\Support\Invoices\InvoicePresentation;
use App\Support\Money\MoneyFormatting;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Read-only subscription snapshot for the tenant portal — only real DB rows, never fabricated.
 * Never exposes internal subscription notes or other admin-only fields.
 */
final class CustomerSubscriptionPayload
{
    /** @return array<string, mixed>|null */
    public static function forCompany(string $companyId): ?array
    {
        /** @phpstan-ignore-next-line */
        $sub = CompanySubscription::query()
            ->where('company_id', $companyId)
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value])
            ->with(['plan', 'billingContact', 'company:id,billing_email,name'])
            ->first();

        if (! $sub instanceof CompanySubscription) {
            return null;
        }

        /** @phpstan-ignore-next-line */
        $recentInvoices = Invoice::query()
            ->where('company_id', $companyId)
            ->where('is_subscription_billing', true)
            ->orderByDesc('issued_on')
            ->orderByDesc('created_at')
            ->limit(24)
            ->get();

        $plan = $sub->plan;

        $usage = app(OrderSubscriptionCoverageService::class)->usageSummaryForSubscription($sub);
        $ovEst = (int) ($usage['estimated_overage_pence'] ?? 0);
        $collectionsUsed = (int) ($usage['collections_used'] ?? 0);
        $knivesUsed = (int) ($usage['knives_used'] ?? 0);
        $hasUsageActivity = $collectionsUsed > 0 || $knivesUsed > 0;
        $periodLedger = app(SubscriptionBillingPeriodService::class)->periodsWithUsageSummaries($sub, 6);

        return [
            'activity_timeline' => CustomerActivityTimelinePresenter::forCompanySubscription($sub),
            'plan_name' => $plan !== null ? $plan->name : $sub->planName(),
            'status' => $sub->status?->value ?? (string) $sub->status,
            'status_label' => self::customerStatusLabel($sub),
            'renews_at' => $sub->renews_at?->format('Y-m-d'),
            'current_period_end' => $sub->renews_at?->format('Y-m-d'),
            'included_services' => $plan?->description,
            'allowance_summary' => self::allowanceSummaryFromPlan($plan),
            'price_amount_minor_snapshot' => (int) $sub->price_amount_minor_snapshot,
            'formatted_price_snapshot_gbp' => strtoupper((string) $sub->currency) === 'GBP'
                ? MoneyFormatting::formatGbpFromPence((int) $sub->price_amount_minor_snapshot)
                : null,
            'summary' => self::summaryLine($plan),
            'billing_contact' => self::billingContactForPortal($sub),
            'recent_billing_periods' => self::trimPeriodsForPortal($periodLedger),
            'recent_invoices' => self::formatInvoices($recentInvoices),
            'period_usage' => [
                'billing_period' => $usage['billing_period'],
                'billing_period_label' => self::usagePeriodLabel($usage['billing_period'] ?? null),
                'included_collections' => $usage['included_collections'],
                'included_knife_allowance' => $usage['included_knife_allowance'],
                'collections_used' => $collectionsUsed,
                'knives_used' => $knivesUsed,
                'collections_overage_units' => $usage['collections_overage_units'],
                'knives_overage_units' => $usage['knives_overage_units'],
                'estimated_overage_pence' => $ovEst,
                'formatted_estimated_overage_gbp' => MoneyFormatting::formatGbpFromPence($ovEst),
                'has_activity' => $hasUsageActivity,
            ],
            'usage_summary_line' => self::usageSummaryLine($plan, $usage, $hasUsageActivity),
            'overage_warning' => $ovEst > 0
                ? 'Some of the work we completed for you this billing period may appear as extra usage on your next subscription invoice. Open the invoice for a full breakdown.'
                : null,
        ];
    }

    private static function customerStatusLabel(CompanySubscription $sub): string
    {
        $st = $sub->status;
        if ($st === SubscriptionStatus::Active) {
            return 'Active';
        }

        if ($st === SubscriptionStatus::PastDue) {
            return 'Payment needed';
        }

        return $st !== null ? Str::headline($st->value) : 'Unknown';
    }

    /**
     * @param  list<array<string, mixed>>  $periods
     * @return list<array<string, mixed>>
     */
    private static function trimPeriodsForPortal(array $periods): array
    {
        $out = [];
        foreach ($periods as $row) {
            $usage = is_array($row['usage'] ?? null) ? $row['usage'] : [];
            $bp = is_array($usage['billing_period'] ?? null) ? $usage['billing_period'] : [];
            $start = is_string($bp['start'] ?? null) ? $bp['start'] : null;
            $end = is_string($bp['end'] ?? null) ? $bp['end'] : null;
            $label = is_string($start) && is_string($end) ? self::formatBillingPeriodLabel($start, $end) : null;
            $out[] = [
                'period_label' => $label,
                'starts_on' => $row['starts_on'] ?? null,
                'ends_on' => $row['ends_on'] ?? null,
                'was_completed_billing_cycle' => ($row['is_closed'] ?? false) === true,
                'collections_used' => (int) ($usage['collections_used'] ?? 0),
                'knives_used' => (int) ($usage['knives_used'] ?? 0),
                'formatted_estimated_overage_gbp' => MoneyFormatting::formatGbpFromPence((int) ($usage['estimated_overage_pence'] ?? 0)),
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>|null  $billingPeriod
     */
    private static function usagePeriodLabel(?array $billingPeriod): ?string
    {
        if (! is_array($billingPeriod)) {
            return null;
        }
        $start = $billingPeriod['start'] ?? null;
        $end = $billingPeriod['end'] ?? null;
        if (! is_string($start) || ! is_string($end)) {
            return null;
        }

        return self::formatBillingPeriodLabel($start, $end);
    }

    /** @param  array<string, mixed>  $usage */
    private static function usageSummaryLine(?SubscriptionPlan $plan, array $usage, bool $hasUsageActivity): ?string
    {
        if (! $hasUsageActivity) {
            return null;
        }
        $coll = (int) ($usage['collections_used'] ?? 0);
        $kn = (int) ($usage['knives_used'] ?? 0);
        $incColl = $plan?->included_collections;
        $incKn = $plan?->included_knife_allowance;
        $parts = [];
        if ($incColl !== null) {
            $parts[] = $coll.' of '.$incColl.' included collection visit'.($incColl === 1 ? '' : 's').' used';
        } else {
            $parts[] = $coll.' collection visit'.($coll === 1 ? '' : 's').' this period';
        }
        if ($incKn !== null) {
            $parts[] = $kn.' of '.$incKn.' knives counted toward your allowance';
        } else {
            $parts[] = $kn.' knives counted this period';
        }

        return implode(' · ', $parts);
    }

    /** @return array{name: string|null, email: string|null, phone: string|null}|null */
    private static function billingContactForPortal(CompanySubscription $sub): ?array
    {
        $c = $sub->billingContact;
        if ($c !== null) {
            $name = trim(trim((string) $c->first_name).' '.trim((string) $c->last_name));
            if ($name === '') {
                $name = null;
            }
            $email = trim((string) ($c->email ?? '')) ?: null;
            $phone = trim((string) ($c->phone ?? '')) ?: null;
            if ($name === null && $email === null && $phone === null) {
                return null;
            }

            return [
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
            ];
        }

        $company = $sub->company;
        $email = $company !== null ? (trim((string) ($company->billing_email ?? '')) ?: null) : null;
        if ($email === null) {
            return null;
        }

        return [
            'name' => null,
            'email' => $email,
            'phone' => null,
        ];
    }

    private static function formatBillingPeriodLabel(string $startYmd, string $endYmd): string
    {
        $s = CarbonImmutable::parse($startYmd);
        $e = CarbonImmutable::parse($endYmd);
        if ($s->format('Y') === $e->format('Y')) {
            if ($s->format('F') === $e->format('F')) {
                return $s->format('j').'–'.$e->format('j').' '.$s->format('F Y');
            }

            return $s->format('j M').' – '.$e->format('j M Y');
        }

        return $s->format('j M Y').' – '.$e->format('j M Y');
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

    private static function summaryLine(?SubscriptionPlan $plan): ?string
    {
        $fromPlan = self::allowanceSummaryFromPlan($plan);
        if ($fromPlan !== null && $fromPlan !== '') {
            return $fromPlan;
        }

        $desc = trim((string) ($plan?->description ?? ''));
        if ($desc !== '') {
            return Str::limit($desc, 200);
        }

        return null;
    }

    /** @param  Collection<int, Invoice>  $invoices */
    private static function formatInvoices(Collection $invoices): array
    {
        return $invoices
            ->map(static function (Invoice $invoice): array {
                $total = (int) $invoice->total_pence;
                $customer = InvoicePresentation::customerStatus($invoice);
                $bps = $invoice->billing_period_start?->format('Y-m-d');
                $bpe = $invoice->billing_period_end?->format('Y-m-d');
                $periodLabel = null;
                if (is_string($bps) && is_string($bpe)) {
                    $periodLabel = self::formatBillingPeriodLabel($bps, $bpe);
                } elseif (is_string($bps)) {
                    $periodLabel = 'From '.$bps;
                } elseif (is_string($bpe)) {
                    $periodLabel = 'Until '.$bpe;
                }

                return [
                    'id' => (string) $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'display_reference' => InvoiceJson::displayReference($invoice),
                    'status' => $invoice->invoice_status?->value,
                    'customer_status_label' => $customer['label'],
                    'customer_status_hint' => $customer['hint'],
                    'issue_date' => $invoice->issued_on?->format('Y-m-d'),
                    'due_date' => $invoice->due_on?->format('Y-m-d'),
                    'billing_period_start' => $bps,
                    'billing_period_end' => $bpe,
                    'billing_period_label' => $periodLabel,
                    'total_pence' => $total,
                    'formatted_total' => MoneyFormatting::formatGbpFromPence($total),
                ];
            })
            ->values()
            ->all();
    }
}
