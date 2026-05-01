<?php

namespace App\Support\Account;

use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\SubscriptionPlan;
use App\Support\Money\MoneyFormatting;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Read-only subscription snapshot for the tenant portal — only real DB rows, never fabricated.
 */
final class CustomerSubscriptionPayload
{
    /** @return array<string, mixed>|null */
    public static function forCompany(string $companyId): ?array
    {
        /** @phpstan-ignore-next-line */
        $sub = CompanySubscription::query()->where('company_id', $companyId)->first();

        if (! $sub instanceof CompanySubscription) {
            return null;
        }

        /** @phpstan-ignore-next-line */
        $recentInvoices = Invoice::query()
            ->where('company_id', $companyId)
            ->where('is_subscription_billing', true)
            ->orderByDesc('issued_on')
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        $plan = $sub->plan;

        return [
            'plan_name' => $plan !== null ? $plan->name : $sub->planName(),
            'status' => $sub->status?->value ?? (string) $sub->status,
            'renews_at' => $sub->renews_at?->format('Y-m-d'),
            'current_period_end' => $sub->renews_at?->format('Y-m-d'),
            'included_services' => $plan?->description,
            'allowance_summary' => self::allowanceSummaryFromPlan($plan),
            'price_amount_minor_snapshot' => (int) $sub->price_amount_minor_snapshot,
            'formatted_price_snapshot_gbp' => strtoupper((string) $sub->currency) === 'GBP'
                ? MoneyFormatting::formatGbpFromPence((int) $sub->price_amount_minor_snapshot)
                : null,
            'summary' => self::summaryLine($plan, $sub),
            'recent_invoices' => self::formatInvoices($recentInvoices),
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

    private static function summaryLine(?SubscriptionPlan $plan, CompanySubscription $sub): ?string
    {
        $fromPlan = self::allowanceSummaryFromPlan($plan);
        if ($fromPlan !== null && $fromPlan !== '') {
            return $fromPlan;
        }

        $desc = trim((string) ($plan?->description ?? ''));
        if ($desc !== '') {
            return Str::limit($desc, 200);
        }

        $notes = trim((string) ($sub->notes ?? ''));

        return $notes !== '' ? Str::limit($notes, 200) : null;
    }

    /** @param  Collection<int, Invoice>  $invoices */
    private static function formatInvoices(Collection $invoices): array
    {
        return $invoices
            ->map(static function (Invoice $invoice): array {
                $total = (int) $invoice->total_pence;

                return [
                    'id' => (string) $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'status' => $invoice->invoice_status?->value,
                    'issue_date' => $invoice->issued_on?->format('Y-m-d'),
                    'due_date' => $invoice->due_on?->format('Y-m-d'),
                    'total_pence' => $total,
                    'formatted_total' => MoneyFormatting::formatGbpFromPence($total),
                ];
            })
            ->values()
            ->all();
    }
}
