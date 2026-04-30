<?php

namespace App\Support\Account;

use App\Models\CompanySubscription;
use App\Models\Invoice;
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

        return [
            'plan_name' => $sub->plan_name,
            'status' => $sub->status,
            'current_period_end' => $sub->current_period_end?->format('Y-m-d'),
            'included_services' => $sub->included_services,
            'allowance_summary' => $sub->allowance_summary,
            'summary' => self::summaryLine($sub),
            'recent_invoices' => self::formatInvoices($recentInvoices),
        ];
    }

    private static function summaryLine(CompanySubscription $sub): ?string
    {
        $allowance = trim((string) ($sub->allowance_summary ?? ''));
        if ($allowance !== '') {
            return $allowance;
        }

        $included = trim((string) ($sub->included_services ?? ''));
        if ($included !== '') {
            return Str::limit($included, 200);
        }

        return null;
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
