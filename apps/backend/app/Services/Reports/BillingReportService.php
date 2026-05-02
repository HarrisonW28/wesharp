<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\Analytics\AnalyticsSql;
use App\Support\Reports\BillingReportSql;
use App\Support\Reports\ReportEnvelope;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

/**
 * Finance-focused invoice, payment, and receivables (ageing) reporting.
 */
final class BillingReportService
{
    private const TOP_OUTSTANDING_COMPANIES = 50;

    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $asOfEnd = $f->to->copy()->utc()->endOfDay();
        $asOfDateStr = $f->to->toDateString();
        $asOfStart = $f->to->copy()->utc()->startOfDay();

        $paidAsOfSub = Payment::query()
            ->selectRaw('invoice_id, SUM(amount_pence) AS paid_pence')
            ->whereNotNull('invoice_id')
            ->where('paid_at', '<=', $asOfEnd)
            ->groupBy('invoice_id');

        $periodInvoiceBase = $this->invoiceIssuedInPeriod($f);

        $lineRevenueBreakdown = $this->invoiceLineRevenueByType($periodInvoiceBase);

        $invoicesSentCount = (int) (clone $periodInvoiceBase)
            ->whereNotIn('invoices.invoice_status', [InvoiceStatus::Draft, InvoiceStatus::Void])
            ->count();

        $invoicesPaidCount = (int) (clone $periodInvoiceBase)
            ->where('invoices.invoice_status', InvoiceStatus::Paid)
            ->count();

        $overdueInvoicesPeriodCount = (int) (clone $periodInvoiceBase)
            ->where('invoices.invoice_status', InvoiceStatus::Overdue)
            ->count();

        $arResidualSub = $this->arResidualSubquery($f, $paidAsOfSub, $asOfDateStr);

        $unpaidInvoicesSnapshotCount = (int) DB::query()
            ->fromSub($arResidualSub, 'ar')
            ->where('ar.residual_pence', '>', 0)
            ->count();

        $totalOutstandingPence = (int) DB::query()
            ->fromSub($arResidualSub, 'ar')
            ->where('ar.residual_pence', '>', 0)
            ->sum('ar.residual_pence');

        $paymentPeriod = $this->paymentsReceivedInPeriod($f);
        $totalPaidPence = (int) (clone $paymentPeriod)->sum('payments.amount_pence');
        $paymentsReceivedCount = (int) (clone $paymentPeriod)->count();

        $paymentMethodBreakdown = (clone $paymentPeriod)
            ->selectRaw('payment_method AS method_value, COUNT(*) AS c, SUM(payments.amount_pence) AS amount_pence')
            ->groupBy('payment_method')
            ->orderBy('payment_method')
            ->get()
            ->map(static fn ($r): array => [
                'payment_method' => (string) $r->method_value,
                'count' => (int) $r->c,
                'amount_pence' => (int) $r->amount_pence,
            ])
            ->values()
            ->all();

        $dayExpr = AnalyticsSql::dateDay('payments.paid_at');
        $paymentsByDay = (clone $paymentPeriod)
            ->selectRaw("{$dayExpr} AS bucket, SUM(payments.amount_pence) AS amount_pence, COUNT(*) AS c")
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(static fn ($r): array => [
                'date' => (string) $r->bucket,
                'amount_pence' => (int) $r->amount_pence,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $ageing = $this->computeAgeingBuckets($f, $paidAsOfSub, $asOfDateStr, $asOfStart);

        $outstandingByCustomer = $this->outstandingByCustomer($f, $paidAsOfSub, $asOfDateStr);

        $averageDaysToPay = $this->averageDaysToPay($f);

        $unpaidPage = $f->unpaidPage ?? $f->page;
        $overduePage = $f->overduePage ?? $f->page;

        $unpaidPaginator = $this->arListQuery($f, $paidAsOfSub, $asOfDateStr, overdueOnly: false)
            ->with(['company:id,name'])
            ->orderBy('invoices.due_on')
            ->orderBy('invoices.issued_on')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $unpaidPage);

        $unpaidRows = collect($unpaidPaginator->items())->map(fn ($inv): array => $this->mapArRow($inv, $asOfStart))->all();

        $overduePaginator = $this->arListQuery($f, $paidAsOfSub, $asOfDateStr, overdueOnly: true)
            ->with(['company:id,name'])
            ->orderBy('invoices.due_on')
            ->orderBy('invoices.issued_on')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $overduePage);

        $overdueRows = collect($overduePaginator->items())->map(fn ($inv): array => $this->mapArRow($inv, $asOfStart))->all();

        $periodPaginator = (clone $periodInvoiceBase)
            ->with(['company:id,name'])
            ->orderByDesc('invoices.issued_on')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $f->page);

        $periodRows = collect($periodPaginator->items())->map(static function ($inv): array {
            /** @var Invoice $inv */
            return [
                'id' => (string) $inv->id,
                'invoice_number' => (string) $inv->invoice_number,
                'invoice_status' => $inv->invoice_status->value,
                'total_pence' => (int) $inv->total_pence,
                'issued_on' => $inv->issued_on?->toDateString(),
                'due_on' => $inv->due_on?->toDateString(),
                'company_name' => $inv->company?->name,
            ];
        })->values()->all();

        $envelope = ReportEnvelope::make(
            'billing',
            $f->toArray(),
            [
                'invoices_sent_count' => $invoicesSentCount,
                'invoices_paid_count' => $invoicesPaidCount,
                'overdue_invoices_period_count' => $overdueInvoicesPeriodCount,
                'unpaid_invoices_snapshot_count' => $unpaidInvoicesSnapshotCount,
                'total_outstanding_pence' => $totalOutstandingPence,
                'total_paid_pence' => $totalPaidPence,
                'payments_received_count' => $paymentsReceivedCount,
                'average_days_to_pay' => $averageDaysToPay,
            ],
            [
                'ageing' => $ageing,
                'payment_method_breakdown' => $paymentMethodBreakdown,
                'payments_by_day' => $paymentsByDay,
                'outstanding_by_customer' => $outstandingByCustomer,
                'invoice_line_revenue_by_type' => $lineRevenueBreakdown,
            ],
            [
                'columns' => [
                    ['key' => 'invoice_number', 'label' => 'Invoice #'],
                    ['key' => 'invoice_status', 'label' => 'Status'],
                    ['key' => 'total_pence', 'label' => 'Total (pence)'],
                    ['key' => 'issued_on', 'label' => 'Issued'],
                    ['key' => 'due_on', 'label' => 'Due'],
                    ['key' => 'company_name', 'label' => 'Company'],
                ],
                'rows' => $periodRows,
                'meta' => [
                    'current_page' => $periodPaginator->currentPage(),
                    'last_page' => $periodPaginator->lastPage(),
                    'per_page' => $periodPaginator->perPage(),
                    'total' => $periodPaginator->total(),
                ],
            ],
            [
                'invoices_sent_count' => 'Invoices with issued_on in range, excluding draft and void.',
                'invoices_paid_count' => 'Invoices in range with status paid.',
                'overdue_invoices_period_count' => 'Invoices in range with status overdue.',
                'unpaid_invoices_snapshot_count' => 'As of date_to: issued invoices (not draft/void) with positive residual (total − payments with paid_at ≤ end of date_to).',
                'total_outstanding_pence' => 'Sum of residuals for that AR snapshot.',
                'total_paid_pence' => 'Sum of payment amounts with paid_at in range (invoice-linked payments, filters apply).',
                'payments_received_count' => 'Payment rows in that paid_at window.',
                'average_days_to_pay' => 'Mean days from issued_on to last payment paid_at for invoices marked paid with issued_on in range; null if none.',
                'ageing' => 'Outstanding residuals bucketed by days past COALESCE(due_on, issued_on) vs date_to.',
                'invoice_line_revenue_by_type' => 'Sum of invoice line totals in the period by line_item_type (one_off_service, subscription, overage, adjustment); issued invoices only, draft/void excluded.',
            ],
        );

        return array_merge($envelope, [
            'unpaid_invoices' => [
                'columns' => [
                    ['key' => 'invoice_number', 'label' => 'Invoice #'],
                    ['key' => 'company_name', 'label' => 'Company'],
                    ['key' => 'due_on', 'label' => 'Due'],
                    ['key' => 'issued_on', 'label' => 'Issued'],
                    ['key' => 'total_pence', 'label' => 'Total (pence)'],
                    ['key' => 'paid_pence', 'label' => 'Paid (pence)'],
                    ['key' => 'residual_pence', 'label' => 'Outstanding (pence)'],
                    ['key' => 'ageing_bucket', 'label' => 'Ageing'],
                ],
                'rows' => $unpaidRows,
                'meta' => [
                    'current_page' => $unpaidPaginator->currentPage(),
                    'last_page' => $unpaidPaginator->lastPage(),
                    'per_page' => $unpaidPaginator->perPage(),
                    'total' => $unpaidPaginator->total(),
                ],
            ],
            'overdue_invoices' => [
                'columns' => [
                    ['key' => 'invoice_number', 'label' => 'Invoice #'],
                    ['key' => 'company_name', 'label' => 'Company'],
                    ['key' => 'due_on', 'label' => 'Due'],
                    ['key' => 'issued_on', 'label' => 'Issued'],
                    ['key' => 'residual_pence', 'label' => 'Outstanding (pence)'],
                    ['key' => 'days_past_due', 'label' => 'Days past due'],
                    ['key' => 'ageing_bucket', 'label' => 'Ageing'],
                ],
                'rows' => $overdueRows,
                'meta' => [
                    'current_page' => $overduePaginator->currentPage(),
                    'last_page' => $overduePaginator->lastPage(),
                    'per_page' => $overduePaginator->perPage(),
                    'total' => $overduePaginator->total(),
                ],
            ],
        ]);
    }

    /**
     * @param  Builder<Invoice>  $periodInvoiceBase
     * @return list<array{line_item_type: string, line_total_pence: int}>
     */
    private function invoiceLineRevenueByType(Builder $periodInvoiceBase): array
    {
        $issued = (clone $periodInvoiceBase)
            ->whereNotIn('invoices.invoice_status', [InvoiceStatus::Draft, InvoiceStatus::Void]);

        $rows = DB::query()
            ->from('invoice_items')
            ->joinSub($issued->select('invoices.id')->toBase(), 'i', 'invoice_items.invoice_id', '=', 'i.id')
            ->selectRaw('invoice_items.line_item_type AS t')
            ->selectRaw('SUM(invoice_items.line_total_pence) AS pence')
            ->groupBy('invoice_items.line_item_type')
            ->orderBy('invoice_items.line_item_type')
            ->get();

        return $rows->map(static fn ($r): array => [
            'line_item_type' => (string) $r->t,
            'line_total_pence' => (int) $r->pence,
        ])->values()->all();
    }

    /**
     * @param  \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder  $paidAsOfSub
     * @return \Illuminate\Database\Eloquent\Builder<Invoice>
     */
    private function invoiceIssuedInPeriod(AdminReportFilters $f): Builder
    {
        return Invoice::query()
            ->whereBetween('invoices.issued_on', [$f->from->toDateString(), $f->to->toDateString()])
            ->whereNotNull('invoices.issued_on')
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('invoices.company_id', $f->companyId))
            ->when($f->invoiceStatus !== null, fn ($q) => $q->where('invoices.invoice_status', $f->invoiceStatus));
    }

    /**
     * @param  \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder  $paidAsOfSub
     * @return \Illuminate\Database\Eloquent\Builder<Invoice>
     */
    private function arBaseQuery(AdminReportFilters $f, $paidAsOfSub, string $asOfDateStr): Builder
    {
        return Invoice::query()
            ->where('invoices.issued_on', '<=', $asOfDateStr)
            ->whereNotNull('invoices.issued_on')
            ->whereNotIn('invoices.invoice_status', [InvoiceStatus::Draft, InvoiceStatus::Void])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('invoices.company_id', $f->companyId))
            ->when($f->invoiceStatus !== null, fn ($q) => $q->where('invoices.invoice_status', $f->invoiceStatus))
            ->leftJoinSub($paidAsOfSub, 'psum', fn (JoinClause $j): JoinClause => $j->whereColumn(
                'psum.invoice_id',
                'invoices.id'
            ));
    }

    /**
     * One row per invoice with residual as of date_to.
     *
     * @param  \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder  $paidAsOfSub
     */
    private function arResidualSubquery(AdminReportFilters $f, $paidAsOfSub, string $asOfDateStr): \Illuminate\Database\Query\Builder
    {
        return $this->arBaseQuery($f, $paidAsOfSub, $asOfDateStr)
            ->selectRaw('invoices.id')
            ->selectRaw('invoices.company_id')
            ->selectRaw('invoices.total_pence')
            ->selectRaw('invoices.due_on')
            ->selectRaw('invoices.issued_on')
            ->selectRaw('COALESCE(psum.paid_pence, 0) AS paid_as_of')
            ->selectRaw(
                'CASE WHEN invoices.total_pence > COALESCE(psum.paid_pence, 0) '
                .'THEN invoices.total_pence - COALESCE(psum.paid_pence, 0) ELSE 0 END AS residual_pence'
            )
            ->toBase();
    }

    /**
     * @param  \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder  $paidAsOfSub
     * @return Builder<Invoice>
     */
    private function arListQuery(AdminReportFilters $f, $paidAsOfSub, string $asOfDateStr, bool $overdueOnly): Builder
    {
        $q = $this->arBaseQuery($f, $paidAsOfSub, $asOfDateStr)
            ->selectRaw(
                'invoices.*, COALESCE(psum.paid_pence, 0) AS paid_as_of, '
                .'CASE WHEN invoices.total_pence > COALESCE(psum.paid_pence, 0) '
                .'THEN invoices.total_pence - COALESCE(psum.paid_pence, 0) ELSE 0 END AS residual_pence'
            )
            ->whereRaw(
                '(CASE WHEN invoices.total_pence > COALESCE(psum.paid_pence, 0) '
                .'THEN invoices.total_pence - COALESCE(psum.paid_pence, 0) ELSE 0 END) > 0'
            );

        if ($overdueOnly) {
            $this->applyOverdueOnly($q, $asOfDateStr);
        }

        $this->applyArAgeBucketFilter($q, $f, $asOfDateStr);

        return $q;
    }

    /**
     * @param  Builder<Invoice>  $q
     */
    private function applyOverdueOnly(Builder $q, string $asOfDateStr): void
    {
        $driver = DB::connection()->getDriverName();
        $due = 'COALESCE(invoices.due_on, invoices.issued_on)';
        if ($driver === 'sqlite') {
            $q->whereRaw("date({$due}) < date(?)", [$asOfDateStr]);
        } else {
            $q->whereRaw("{$due} < ?", [$asOfDateStr]);
        }
    }

    /**
     * @param  Builder<Invoice>  $q
     */
    private function applyArAgeBucketFilter(Builder $q, AdminReportFilters $f, string $asOfDateStr): void
    {
        if ($f->arAgeBucket === null || $f->arAgeBucket === '') {
            return;
        }

        $driver = DB::connection()->getDriverName();
        $due = 'COALESCE(invoices.due_on, invoices.issued_on)';

        match ($f->arAgeBucket) {
            'current' => $driver === 'sqlite'
                ? $q->whereRaw('date(?) <= date('.$due.')', [$asOfDateStr])
                : $q->whereRaw('? <= '.$due, [$asOfDateStr]),
            '1_30' => $this->applyDaysPastDueRange($q, $asOfDateStr, $due, 1, 30, $driver),
            '31_60' => $this->applyDaysPastDueRange($q, $asOfDateStr, $due, 31, 60, $driver),
            '61_90' => $this->applyDaysPastDueRange($q, $asOfDateStr, $due, 61, 90, $driver),
            '90_plus' => $this->applyDaysPastDueMin($q, $asOfDateStr, $due, 91, $driver),
            default => null,
        };
    }

    /**
     * @param  Builder<Invoice>  $q
     */
    private function applyDaysPastDueRange(Builder $q, string $asOf, string $dueExpr, int $min, int $max, string $driver): void
    {
        if ($driver === 'sqlite') {
            $q->whereRaw(
                'CAST((julianday(?) - julianday('.$dueExpr.')) AS INTEGER) BETWEEN ? AND ?',
                [$asOf, $min, $max]
            );
        } elseif ($driver === 'pgsql') {
            $q->whereRaw('(?::date - '.$dueExpr.'::date) BETWEEN ? AND ?', [$asOf, $min, $max]);
        } else {
            $q->whereRaw('DATEDIFF(?, '.$dueExpr.') BETWEEN ? AND ?', [$asOf, $min, $max]);
        }
    }

    /**
     * @param  Builder<Invoice>  $q
     */
    private function applyDaysPastDueMin(Builder $q, string $asOf, string $dueExpr, int $minDays, string $driver): void
    {
        if ($driver === 'sqlite') {
            $q->whereRaw('CAST((julianday(?) - julianday('.$dueExpr.')) AS INTEGER) >= ?', [$asOf, $minDays]);
        } elseif ($driver === 'pgsql') {
            $q->whereRaw('(?::date - '.$dueExpr.'::date) >= ?', [$asOf, $minDays]);
        } else {
            $q->whereRaw('DATEDIFF(?, '.$dueExpr.') >= ?', [$asOf, $minDays]);
        }
    }

    private function paymentsReceivedInPeriod(AdminReportFilters $f): Builder
    {
        return Payment::query()
            ->whereBetween('payments.paid_at', [$f->from, $f->to])
            ->whereNotNull('payments.invoice_id')
            ->when($f->companyId !== null, fn ($q) => $q->where('payments.company_id', $f->companyId))
            ->when($f->paymentMethod !== null, fn ($q) => $q->where('payments.payment_method', $f->paymentMethod))
            ->when($f->paymentStatus !== null, fn ($q) => $q->where('payments.payment_status', $f->paymentStatus))
            ->when($f->city !== null && $f->city !== '', function ($q) use ($f): void {
                $q->whereHas('invoice', fn ($iq) => $iq->whereCompanyCity($f->city));
            });
    }

    /**
     * @param  \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder  $paidAsOfSub
     * @return list<array{bucket: string, invoice_count: int, outstanding_pence: int}>
     */
    private function computeAgeingBuckets(AdminReportFilters $f, $paidAsOfSub, string $asOfDateStr, CarbonInterface $asOfStart): array
    {
        $template = [
            'current' => ['invoice_count' => 0, 'outstanding_pence' => 0],
            '1_30' => ['invoice_count' => 0, 'outstanding_pence' => 0],
            '31_60' => ['invoice_count' => 0, 'outstanding_pence' => 0],
            '61_90' => ['invoice_count' => 0, 'outstanding_pence' => 0],
            '90_plus' => ['invoice_count' => 0, 'outstanding_pence' => 0],
        ];

        $q = $this->arBaseQuery($f, $paidAsOfSub, $asOfDateStr)
            ->select(['invoices.due_on', 'invoices.issued_on'])
            ->selectRaw(
                'CASE WHEN invoices.total_pence > COALESCE(psum.paid_pence, 0) '
                .'THEN invoices.total_pence - COALESCE(psum.paid_pence, 0) ELSE 0 END AS residual_pence'
            );

        foreach ($q->cursor() as $row) {
            $residual = (int) $row->residual_pence;
            if ($residual <= 0) {
                continue;
            }
            $due = $row->due_on !== null ? Carbon::parse($row->due_on)->startOfDay() : Carbon::parse($row->issued_on)->startOfDay();
            $bucket = $this->ageingBucketLabel($asOfStart, $due);
            $template[$bucket]['invoice_count']++;
            $template[$bucket]['outstanding_pence'] += $residual;
        }

        $out = [];
        foreach ($template as $bucket => $vals) {
            $out[] = [
                'bucket' => $bucket,
                'invoice_count' => $vals['invoice_count'],
                'outstanding_pence' => $vals['outstanding_pence'],
            ];
        }

        return $out;
    }

    private function ageingBucketLabel(CarbonInterface $asOfStart, CarbonInterface $dueStart): string
    {
        if ($asOfStart->lte($dueStart)) {
            return 'current';
        }
        $days = $dueStart->diffInDays($asOfStart);
        if ($days <= 30) {
            return '1_30';
        }
        if ($days <= 60) {
            return '31_60';
        }
        if ($days <= 90) {
            return '61_90';
        }

        return '90_plus';
    }

    /**
     * @param  \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder  $paidAsOfSub
     * @return list<array{company_id: string, company_name: string, outstanding_pence: int}>
     */
    private function outstandingByCustomer(AdminReportFilters $f, $paidAsOfSub, string $asOfDateStr): array
    {
        $totals = [];

        $q = $this->arBaseQuery($f, $paidAsOfSub, $asOfDateStr)
            ->join('companies', 'companies.id', '=', 'invoices.company_id')
            ->selectRaw('invoices.company_id AS company_id')
            ->selectRaw('companies.name AS company_name')
            ->selectRaw(
                'CASE WHEN invoices.total_pence > COALESCE(psum.paid_pence, 0) '
                .'THEN invoices.total_pence - COALESCE(psum.paid_pence, 0) ELSE 0 END AS residual_pence'
            );

        foreach ($q->cursor() as $row) {
            $residual = (int) $row->residual_pence;
            if ($residual <= 0) {
                continue;
            }
            $cid = (string) $row->company_id;
            if (! isset($totals[$cid])) {
                $totals[$cid] = ['company_name' => (string) $row->company_name, 'outstanding_pence' => 0];
            }
            $totals[$cid]['outstanding_pence'] += $residual;
        }

        uasort($totals, static fn ($a, $b): int => $b['outstanding_pence'] <=> $a['outstanding_pence']);

        $out = [];
        $n = 0;
        foreach ($totals as $companyId => $row) {
            $out[] = [
                'company_id' => $companyId,
                'company_name' => $row['company_name'],
                'outstanding_pence' => $row['outstanding_pence'],
            ];
            $n++;
            if ($n >= self::TOP_OUTSTANDING_COMPANIES) {
                break;
            }
        }

        return $out;
    }

    private function averageDaysToPay(AdminReportFilters $f): ?float
    {
        $lastPaid = Payment::query()
            ->selectRaw('invoice_id, MAX(paid_at) AS last_paid_at')
            ->whereNotNull('invoice_id')
            ->groupBy('invoice_id');

        $avgExpr = BillingReportSql::avgDaysIssuedToPaid('invoices.issued_on', 'lp.last_paid_at');

        $row = Invoice::query()
            ->joinSub($lastPaid->toBase(), 'lp', fn (JoinClause $j): JoinClause => $j->whereColumn('lp.invoice_id', 'invoices.id'))
            ->whereBetween('invoices.issued_on', [$f->from->toDateString(), $f->to->toDateString()])
            ->where('invoices.invoice_status', InvoiceStatus::Paid)
            ->whereNotNull('invoices.issued_on')
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('invoices.company_id', $f->companyId))
            ->when($f->invoiceStatus !== null, fn ($q) => $q->where('invoices.invoice_status', $f->invoiceStatus))
            ->selectRaw("{$avgExpr} AS avg_days")
            ->first();

        if ($row === null || $row->avg_days === null) {
            return null;
        }

        $v = (float) $row->avg_days;

        return round($v, 2);
    }

    /** @param  Invoice&object{paid_as_of?: int, residual_pence?: int}  $inv */
    private function mapArRow(Invoice $inv, CarbonInterface $asOfStart): array
    {
        $paid = (int) ($inv->paid_as_of ?? 0);
        $residual = (int) ($inv->residual_pence ?? max(0, $inv->total_pence - $paid));
        $due = $inv->due_on !== null ? Carbon::parse($inv->due_on)->startOfDay() : Carbon::parse($inv->issued_on)->startOfDay();
        $bucket = $this->ageingBucketLabel($asOfStart, $due);
        $daysPastDue = $asOfStart->lt($due) ? 0 : $due->diffInDays($asOfStart);

        return [
            'id' => (string) $inv->id,
            'invoice_number' => (string) $inv->invoice_number,
            'company_name' => $inv->company?->name,
            'issued_on' => $inv->issued_on?->toDateString(),
            'due_on' => $inv->due_on?->toDateString(),
            'total_pence' => (int) $inv->total_pence,
            'paid_pence' => $paid,
            'residual_pence' => $residual,
            'days_past_due' => $daysPastDue,
            'ageing_bucket' => $bucket,
        ];
    }
}
