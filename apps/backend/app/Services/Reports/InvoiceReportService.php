<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\Reports\ReportEnvelope;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

final class InvoiceReportService
{
    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $base = Invoice::query()
            ->whereBetween('invoices.issued_on', [$f->from->toDateString(), $f->to->toDateString()])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('invoices.company_id', $f->companyId))
            ->when($f->invoiceStatus !== null, fn ($q) => $q->where('invoices.invoice_status', $f->invoiceStatus));

        $total = (int) (clone $base)->count();
        $billedPence = (int) (clone $base)->sum('invoices.total_pence');

        $byStatus = (clone $base)
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

        $receivedSub = Payment::query()
            ->selectRaw('invoice_id, SUM(amount_pence) AS paid_pence')
            ->whereNotNull('invoice_id')
            ->groupBy('invoice_id');

        $outstandingPence = (int) (clone $base)
            ->outstanding()
            ->leftJoinSub($receivedSub, 'psum', fn (JoinClause $j): JoinClause => $j->whereColumn(
                'psum.invoice_id',
                'invoices.id'
            ))
            ->sum(DB::raw(
                '(CASE WHEN COALESCE(psum.paid_pence, 0) < invoices.total_pence '
                .'THEN invoices.total_pence - COALESCE(psum.paid_pence, 0) ELSE 0 END)'
            ));

        $paginator = (clone $base)
            ->with(['company:id,name'])
            ->orderByDesc('invoices.issued_on')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $f->page);

        $rows = collect($paginator->items())->map(static function ($inv): array {
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

        return ReportEnvelope::make(
            'invoices',
            $f->toArray(),
            [
                'invoice_count' => $total,
                'billed_amount_pence' => $billedPence,
                'outstanding_residual_pence' => $outstandingPence,
                'paid_count' => (int) (clone $base)->where('invoice_status', InvoiceStatus::Paid)->count(),
            ],
            $byStatus,
            [
                'columns' => [
                    ['key' => 'invoice_number', 'label' => 'Invoice #'],
                    ['key' => 'invoice_status', 'label' => 'Status'],
                    ['key' => 'total_pence', 'label' => 'Total (pence)'],
                    ['key' => 'issued_on', 'label' => 'Issued'],
                    ['key' => 'due_on', 'label' => 'Due'],
                    ['key' => 'company_name', 'label' => 'Company'],
                ],
                'rows' => $rows,
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ],
            [
                'invoice_count' => 'Invoices with issued_on in range (inclusive).',
                'billed_amount_pence' => 'Sum of total_pence for those invoices.',
                'outstanding_residual_pence' => 'Residual balance on outstanding invoices in the filtered set (total − payments).',
                'paid_count' => 'Invoices in range with status paid.',
            ],
        );
    }
}
