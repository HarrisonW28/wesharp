<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Enums\InvoiceStatus;
use App\Http\Requests\Admin\FinanceDashboardRequest;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\Invoices\InvoiceJson;
use App\Support\Invoices\InvoiceRollup;
use App\Support\Money\MoneyFormatting;
use App\Support\Payments\PaymentJson;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

final class FinanceDashboardService
{
    public function __construct(
        private readonly RecurringRevenueMetricsService $recurringRevenueMetrics,
    ) {}

    /** @return array<string, mixed> */
    public function build(FinanceDashboardRequest $request): array
    {
        $tz = config('app.timezone', 'UTC');
        $now = CarbonImmutable::now($tz);

        /** @var string|null $df */
        $df = $request->validated('date_from');
        /** @var string|null $dt */
        $dt = $request->validated('date_to');
        /** @var string|null $companyId */
        $companyId = $request->validated('company_id');
        /** @var string|null $invoiceStatus */
        $invoiceStatus = $request->validated('invoice_status');

        $periodStart = $df !== null ? CarbonImmutable::parse($df, $tz)->startOfDay() : $now->startOfMonth();
        $periodEnd = $dt !== null ? CarbonImmutable::parse($dt, $tz)->endOfDay() : $now->endOfMonth();

        $openInvoiceQuery = $this->scopedOpenInvoices($companyId, $invoiceStatus);
        $unpaidQuery = (clone $openInvoiceQuery)->whereRaw(
            'invoices.total_pence > COALESCE((SELECT SUM(amount_pence) FROM payments WHERE payments.invoice_id = invoices.id), 0)'
        );

        $unpaidIds = $unpaidQuery->pluck('id');
        $unpaidCount = $unpaidIds->count();
        $outstandingPence = $this->sumOutstandingForInvoiceIds($unpaidIds);

        $overdueCount = (int) (clone $unpaidQuery)
            ->whereIn('invoice_status', [InvoiceStatus::Sent, InvoiceStatus::Overdue])
            ->whereNotNull('due_on')
            ->whereDate('due_on', '<', $now->toDateString())
            ->count();

        $draftQuery = Invoice::query()
            ->where('invoice_status', InvoiceStatus::Draft)
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId));

        if ($invoiceStatus !== null && $invoiceStatus !== InvoiceStatus::Draft->value) {
            $draftQuery->whereRaw('1 = 0');
        }

        $draftCount = (int) (clone $draftQuery)->count();

        $voidCount = (int) Invoice::query()
            ->where('invoice_status', InvoiceStatus::Void)
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->whereBetween('updated_at', [$periodStart, $periodEnd])
            ->count();

        $paymentBase = Payment::query()
            ->whereBetween('paid_at', [$periodStart, $periodEnd])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->where(function (Builder $q): void {
                $q->whereNull('invoice_id')
                    ->orWhereHas('invoice', fn (Builder $iq) => $iq->where('invoice_status', '!=', InvoiceStatus::Void->value));
            });

        $paidInPeriodPence = (int) (clone $paymentBase)->sum('amount_pence');
        $paymentCountInPeriod = (int) (clone $paymentBase)->count();

        $subscriptionPaymentsPence = (int) Payment::query()
            ->whereBetween('paid_at', [$periodStart, $periodEnd])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->whereHas('invoice', function (Builder $iq): void {
                $iq->where('is_subscription_billing', true)
                    ->where('invoice_status', '!=', InvoiceStatus::Void->value);
            })
            ->sum('amount_pence');

        $overdueInvoices = (clone $unpaidQuery)
            ->whereIn('invoice_status', [InvoiceStatus::Sent, InvoiceStatus::Overdue])
            ->whereNotNull('due_on')
            ->whereDate('due_on', '<', $now->toDateString())
            ->with([
                'company:id,name',
                'order:id,booking_id,created_at,order_status',
                'payments:id,invoice_id,amount_pence',
            ])
            ->orderBy('due_on')
            ->limit(25)
            ->get();

        $draftInvoices = (clone $draftQuery)
            ->with([
                'company:id,name',
                'order:id,booking_id,created_at,order_status',
                'payments:id,invoice_id,amount_pence',
            ])
            ->orderByDesc('updated_at')
            ->limit(25)
            ->get();

        $recentPayments = Payment::query()
            ->with([
                'company:id,name',
                'invoice:id,invoice_number,company_id',
                'order:id,booking_id',
                'recordedBy:id,name,email',
            ])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->orderByDesc('paid_at')
            ->orderByDesc('created_at')
            ->limit(15)
            ->get();

        $topOutstanding = $this->topOutstandingCompanies($companyId, $invoiceStatus, 8);

        $recurring = $this->recurringRevenueMetrics->build($periodStart, $periodEnd, $companyId);

        return [
            'period' => [
                'date_from' => $periodStart->toDateString(),
                'date_to' => $periodEnd->toDateString(),
                'timezone' => (string) $tz,
            ],
            'filters_applied' => [
                'company_id' => $companyId,
                'invoice_status' => $invoiceStatus,
            ],
            'kpis' => [
                'unpaid_invoice_count' => $unpaidCount,
                'overdue_invoice_count' => $overdueCount,
                'draft_invoice_count' => $draftCount,
                'void_invoice_count_period' => $voidCount,
                'outstanding_pence' => $outstandingPence,
                'formatted_outstanding' => MoneyFormatting::formatGbpFromPence($outstandingPence),
                'paid_in_period_pence' => $paidInPeriodPence,
                'formatted_paid_in_period' => MoneyFormatting::formatGbpFromPence($paidInPeriodPence),
                'payment_count_in_period' => $paymentCountInPeriod,
                'subscription_tagged_payments_in_period_pence' => $subscriptionPaymentsPence,
                'formatted_subscription_tagged_payments_in_period' => MoneyFormatting::formatGbpFromPence($subscriptionPaymentsPence),
            ],
            'kpis_note' => 'Outstanding, unpaid, overdue, and drafts are snapshots (current open AR). Paid amounts and void-in-period use the selected date range.',
            'subscription' => [
                'upcoming_renewals' => $recurring['upcoming_renewals'],
                'has_subscription_rows' => (bool) ($recurring['has_subscription_rows'] ?? false),
            ],
            'recurring_revenue' => $recurring,
            'integrations' => [
                'xero' => [
                    'configured' => false,
                    'issues' => [],
                    'message' => 'Xero is not connected. No sync issues to report.',
                ],
                'stripe' => [
                    'issues' => [],
                    'message' => 'No automated Stripe reconciliation alerts. Verify webhooks in Stripe Dashboard.',
                ],
            ],
            'overdue_invoices' => $overdueInvoices->map(fn (Invoice $i): array => $this->invoiceRow($i))->values()->all(),
            'draft_invoices' => $draftInvoices->map(fn (Invoice $i): array => $this->invoiceRow($i))->values()->all(),
            'recent_payments' => $recentPayments->map(fn (Payment $p): array => PaymentJson::detail($p))->values()->all(),
            'top_outstanding_companies' => $topOutstanding,
        ];
    }

    private function scopedOpenInvoices(?string $companyId, ?string $invoiceStatus): Builder
    {
        return Invoice::query()
            ->whereNotIn('invoice_status', [InvoiceStatus::Void, InvoiceStatus::Paid, InvoiceStatus::Draft])
            ->when($companyId !== null, fn (Builder $b) => $b->where('company_id', $companyId))
            ->when($invoiceStatus !== null, fn (Builder $b) => $b->where('invoice_status', $invoiceStatus));
    }

    /** @param  Collection<int, mixed>  $ids */
    private function sumOutstandingForInvoiceIds(Collection $ids): int
    {
        if ($ids->isEmpty()) {
            return 0;
        }

        $paidByInvoice = Payment::query()
            ->whereIn('invoice_id', $ids)
            ->selectRaw('invoice_id, SUM(amount_pence) as s')
            ->groupBy('invoice_id')
            ->pluck('s', 'invoice_id');

        $total = 0;
        $invoices = Invoice::query()->whereIn('id', $ids)->get(['id', 'total_pence']);
        foreach ($invoices as $inv) {
            $rec = (int) ($paidByInvoice[(string) $inv->id] ?? 0);
            $total += max(0, (int) $inv->total_pence - $rec);
        }

        return $total;
    }

    /** @return list<array{company_id: string, company_name: string|null, outstanding_pence: int, formatted_outstanding: string}> */
    private function topOutstandingCompanies(?string $companyId, ?string $invoiceStatus, int $limit): array
    {
        $q = Invoice::query()
            ->whereNotIn('invoice_status', [InvoiceStatus::Void, InvoiceStatus::Paid, InvoiceStatus::Draft])
            ->when($companyId !== null, fn (Builder $b) => $b->where('company_id', $companyId))
            ->when($invoiceStatus !== null, fn (Builder $b) => $b->where('invoice_status', $invoiceStatus));

        $ids = $q->pluck('id');
        if ($ids->isEmpty()) {
            return [];
        }

        $paidByInvoice = Payment::query()
            ->whereIn('invoice_id', $ids)
            ->selectRaw('invoice_id, SUM(amount_pence) as s')
            ->groupBy('invoice_id')
            ->pluck('s', 'invoice_id');

        $byCompany = [];
        $invoices = Invoice::query()->whereIn('id', $ids)->get(['id', 'company_id', 'total_pence']);
        foreach ($invoices as $inv) {
            $rec = (int) ($paidByInvoice[(string) $inv->id] ?? 0);
            $out = max(0, (int) $inv->total_pence - $rec);
            if ($out <= 0) {
                continue;
            }
            $cid = (string) $inv->company_id;
            $byCompany[$cid] = ($byCompany[$cid] ?? 0) + $out;
        }

        arsort($byCompany);
        $top = array_slice($byCompany, 0, $limit, true);
        if ($top === []) {
            return [];
        }

        $names = Company::query()->whereIn('id', array_keys($top))->pluck('name', 'id');

        $rows = [];
        foreach ($top as $cid => $pence) {
            $rows[] = [
                'company_id' => $cid,
                'company_name' => $names[$cid] ?? null,
                'outstanding_pence' => $pence,
                'formatted_outstanding' => MoneyFormatting::formatGbpFromPence($pence),
            ];
        }

        return $rows;
    }

    private function outstandingForInvoice(Invoice $invoice): int
    {
        if ($invoice->invoice_status === InvoiceStatus::Void || $invoice->invoice_status === InvoiceStatus::Paid) {
            return 0;
        }

        $total = (int) $invoice->total_pence;
        $received = $invoice->relationLoaded('payments')
            ? (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence)
            : (int) $invoice->payments()->sum('amount_pence');

        if ($invoice->invoice_status === InvoiceStatus::Draft) {
            return 0;
        }

        return max(0, $total - $received);
    }

    /** @return array<string, mixed> */
    private function invoiceRow(Invoice $invoice): array
    {
        $invoice->loadMissing([
            'company:id,name',
            'order:id,booking_id,created_at,order_status',
            'payments:id,invoice_id,amount_pence',
        ]);

        $base = InvoiceJson::listRow($invoice);
        $base['outstanding_pence'] = $this->outstandingForInvoice($invoice);
        $base['formatted_outstanding'] = MoneyFormatting::formatGbpFromPence((int) $base['outstanding_pence']);
        $base['is_overdue'] = InvoiceRollup::isPastDue($invoice);

        return $base;
    }
}
