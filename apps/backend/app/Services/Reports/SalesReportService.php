<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\Analytics\AnalyticsSql;
use App\Support\Reports\ReportEnvelope;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

/**
 * Sales / revenue reporting from invoices and payments (accrual + cash in period).
 */
final class SalesReportService
{
    private const RECENT_LIMIT = 25;

    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $paidSub = Payment::query()
            ->selectRaw('invoice_id, SUM(amount_pence) AS paid_pence')
            ->whereNotNull('invoice_id')
            ->groupBy('invoice_id');

        $revenueCohort = $this->revenueCohortQuery($f);

        $totalBilledPence = (int) (clone $revenueCohort)->sum('invoices.total_pence');
        $invoiceCountForAvg = (int) (clone $revenueCohort)->count();
        $averageInvoiceValuePence = $invoiceCountForAvg > 0
            ? (int) floor($totalBilledPence / $invoiceCountForAvg)
            : 0;

        $unpaidResidualPence = (int) (clone $revenueCohort)
            ->leftJoinSub($paidSub, 'psum', fn (JoinClause $j): JoinClause => $j->whereColumn(
                'psum.invoice_id',
                'invoices.id'
            ))
            ->sum(DB::raw(
                'CASE WHEN COALESCE(psum.paid_pence, 0) < invoices.total_pence '
                .'THEN invoices.total_pence - COALESCE(psum.paid_pence, 0) ELSE 0 END'
            ));

        $collectedOnCohortPence = (int) (clone $revenueCohort)
            ->leftJoinSub($paidSub, 'psum2', fn (JoinClause $j): JoinClause => $j->whereColumn(
                'psum2.invoice_id',
                'invoices.id'
            ))
            ->sum(DB::raw(
                'CASE WHEN invoices.total_pence < COALESCE(psum2.paid_pence, 0) '
                .'THEN invoices.total_pence ELSE COALESCE(psum2.paid_pence, 0) END'
            ));

        $paymentBase = $this->paymentsReceivedInPeriodQuery($f);

        $paidCashInPeriodPence = (int) (clone $paymentBase)->sum('payments.amount_pence');
        $paymentsReceivedCount = (int) (clone $paymentBase)->count();

        $outstandingCohort = (clone $revenueCohort)
            ->where('invoices.invoice_status', '!=', InvoiceStatus::Paid)
            ->leftJoinSub($paidSub, 'psum3', fn (JoinClause $j): JoinClause => $j->whereColumn(
                'psum3.invoice_id',
                'invoices.id'
            ));

        $outstandingBalancePence = (int) (clone $outstandingCohort)->sum(DB::raw(
            'CASE WHEN COALESCE(psum3.paid_pence, 0) < invoices.total_pence '
            .'THEN invoices.total_pence - COALESCE(psum3.paid_pence, 0) ELSE 0 END'
        ));

        $invoicesSentCount = (int) $this->invoiceIssuedInPeriodQuery($f)
            ->whereIn('invoice_status', [
                InvoiceStatus::Sent,
                InvoiceStatus::Overdue,
                InvoiceStatus::Paid,
            ])
            ->count();

        $dayExpr = AnalyticsSql::dateDay('invoices.issued_on');
        $revenueByDay = (clone $revenueCohort)
            ->selectRaw("{$dayExpr} AS bucket, SUM(invoices.total_pence) AS revenue_pence")
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(static fn ($r): array => [
                'date' => (string) $r->bucket,
                'revenue_pence' => (int) $r->revenue_pence,
            ])
            ->values()
            ->all();

        $statusBreakdown = $this->invoiceIssuedInPeriodQuery($f)
            ->where('invoices.invoice_status', '!=', InvoiceStatus::Void)
            ->selectRaw('invoice_status AS status_value, COUNT(*) AS c, SUM(invoices.total_pence) AS total_pence')
            ->groupBy('invoice_status')
            ->orderBy('invoice_status')
            ->get()
            ->map(static fn ($r): array => [
                'status' => (string) $r->status_value,
                'count' => (int) $r->c,
                'total_pence' => (int) $r->total_pence,
            ])
            ->values()
            ->all();

        $topCustomers = (clone $revenueCohort)
            ->join('companies', 'companies.id', '=', 'invoices.company_id')
            ->groupBy('companies.id', 'companies.name')
            ->selectRaw('companies.id AS company_id, companies.name AS company_name, SUM(invoices.total_pence) AS revenue_pence')
            ->orderByDesc('revenue_pence')
            ->limit(50)
            ->get()
            ->map(static fn ($r): array => [
                'company_id' => (string) $r->company_id,
                'company_name' => (string) $r->company_name,
                'revenue_pence' => (int) $r->revenue_pence,
            ])
            ->values()
            ->all();

        $recentInvoices = $this->invoiceIssuedInPeriodQuery($f)
            ->with(['company:id,name'])
            ->orderByDesc('invoices.issued_on')
            ->limit(self::RECENT_LIMIT)
            ->get()
            ->map(static function (Invoice $inv): array {
                return [
                    'id' => (string) $inv->id,
                    'invoice_number' => (string) $inv->invoice_number,
                    'invoice_status' => $inv->invoice_status->value,
                    'total_pence' => (int) $inv->total_pence,
                    'issued_on' => $inv->issued_on?->toDateString(),
                    'company_name' => $inv->company?->name,
                ];
            })
            ->values()
            ->all();

        $recentPayments = (clone $paymentBase)
            ->with([
                'invoice:id,invoice_number,company_id',
                'invoice.company:id,name',
            ])
            ->orderByDesc('payments.paid_at')
            ->limit(self::RECENT_LIMIT)
            ->get()
            ->map(static function (Payment $p): array {
                return [
                    'id' => (string) $p->id,
                    'amount_pence' => (int) $p->amount_pence,
                    'payment_status' => $p->payment_status->value,
                    'payment_method' => $p->payment_method?->value ?? '',
                    'paid_at' => $p->paid_at?->toIso8601String(),
                    'invoice_id' => $p->invoice_id !== null ? (string) $p->invoice_id : null,
                    'invoice_number' => $p->invoice?->invoice_number,
                    'company_name' => $p->invoice?->company?->name,
                ];
            })
            ->values()
            ->all();

        $envelope = ReportEnvelope::make(
            'sales',
            $f->toArray(),
            [
                'total_revenue_pence' => $totalBilledPence,
                'paid_revenue_pence' => $paidCashInPeriodPence,
                'unpaid_revenue_pence' => $unpaidResidualPence,
                'average_invoice_value_pence' => $averageInvoiceValuePence,
                'invoices_sent_count' => $invoicesSentCount,
                'payments_received_count' => $paymentsReceivedCount,
                'outstanding_balance_pence' => $outstandingBalancePence,
            ],
            [
                'revenue_by_day' => $revenueByDay,
                'paid_vs_unpaid' => [
                    'collected_on_period_invoices_pence' => $collectedOnCohortPence,
                    'unpaid_residual_on_period_invoices_pence' => $unpaidResidualPence,
                ],
                'invoice_status_breakdown' => $statusBreakdown,
            ],
            [
                'columns' => [
                    ['key' => 'company_name', 'label' => 'Customer'],
                    ['key' => 'revenue_pence', 'label' => 'Billed (pence)'],
                ],
                'rows' => $topCustomers,
                'meta' => ['note' => 'Top 50 customers by billed amount (revenue cohort).'],
            ],
            [
                'total_revenue_pence' => 'Accrual: sum of invoice totals issued in range, excluding void and draft unless status filter selects them. Cohort for averages and top customers.',
                'paid_revenue_pence' => 'Cash: sum of payment amounts with paid_at in range on invoices matching the same issued_on / company / city scope (non-void). Respects payment_status filter.',
                'unpaid_revenue_pence' => 'Residual balance on that revenue cohort (total − payments per invoice, floored at 0).',
                'average_invoice_value_pence' => 'total_revenue_pence ÷ invoice count in revenue cohort (not order-level).',
                'invoices_sent_count' => 'Count of invoices with issued_on in range and status sent, overdue, or paid.',
                'payments_received_count' => 'Payment rows with paid_at in range matching payment query scope.',
                'outstanding_balance_pence' => 'Residual on revenue-cohort invoices not marked paid (sent/overdue/partial).',
                'paid_vs_unpaid' => 'Collected vs residual on the same revenue cohort (not necessarily equal to cash in period).',
            ],
        );

        return array_merge($envelope, [
            'recent_invoices' => [
                'columns' => [
                    ['key' => 'invoice_number', 'label' => 'Invoice'],
                    ['key' => 'invoice_status', 'label' => 'Status'],
                    ['key' => 'issued_on', 'label' => 'Issued'],
                    ['key' => 'total_pence', 'label' => 'Total (pence)'],
                    ['key' => 'company_name', 'label' => 'Customer'],
                ],
                'rows' => $recentInvoices,
            ],
            'recent_payments' => [
                'columns' => [
                    ['key' => 'amount_pence', 'label' => 'Amount (pence)'],
                    ['key' => 'invoice_number', 'label' => 'Invoice'],
                    ['key' => 'company_name', 'label' => 'Customer'],
                    ['key' => 'payment_status', 'label' => 'Status'],
                    ['key' => 'paid_at', 'label' => 'Paid at'],
                ],
                'rows' => $recentPayments,
            ],
        ]);
    }

    /** @return EloquentBuilder<Invoice> */
    private function invoiceIssuedInPeriodQuery(AdminReportFilters $f): EloquentBuilder
    {
        return Invoice::query()
            ->whereNotNull('invoices.issued_on')
            ->whereBetween('invoices.issued_on', [$f->from->toDateString(), $f->to->toDateString()])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn (EloquentBuilder $q) => $q->where('invoices.company_id', $f->companyId))
            ->when($f->invoiceStatus !== null, fn (EloquentBuilder $q) => $q->where('invoices.invoice_status', $f->invoiceStatus));
    }

    /** @return EloquentBuilder<Invoice> */
    private function revenueCohortQuery(AdminReportFilters $f): EloquentBuilder
    {
        $q = $this->invoiceIssuedInPeriodQuery($f)
            ->where('invoices.invoice_status', '!=', InvoiceStatus::Void);

        if ($f->invoiceStatus === null) {
            $q->where('invoices.invoice_status', '!=', InvoiceStatus::Draft);
        }

        return $q;
    }

    /** @return EloquentBuilder<Payment> */
    private function paymentsReceivedInPeriodQuery(AdminReportFilters $f): EloquentBuilder
    {
        return Payment::query()
            ->whereBetween('payments.paid_at', [$f->from, $f->to])
            ->whereNotNull('payments.invoice_id')
            ->whereNotNull('payments.paid_at')
            ->when($f->companyId !== null, fn (EloquentBuilder $q) => $q->where('payments.company_id', $f->companyId))
            ->when($f->paymentStatus !== null, fn (EloquentBuilder $q) => $q->where('payments.payment_status', $f->paymentStatus))
            ->whereHas('invoice', function (EloquentBuilder $q) use ($f): void {
                $q->whereNotNull('issued_on')
                    ->whereBetween('issued_on', [$f->from->toDateString(), $f->to->toDateString()])
                    ->where('invoice_status', '!=', InvoiceStatus::Void)
                    ->whereCompanyCity($f->city)
                    ->when($f->companyId !== null, fn (EloquentBuilder $iq) => $iq->where('company_id', $f->companyId))
                    ->when($f->invoiceStatus !== null, fn (EloquentBuilder $iq) => $iq->where('invoice_status', $f->invoiceStatus));
            });
    }
}
