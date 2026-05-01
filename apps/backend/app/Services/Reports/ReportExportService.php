<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Enums\InvoiceStatus;
use App\Enums\RouteStopStatus;
use App\Models\Booking;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\Payment;
use App\Support\Reports\CsvValueFormatter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Filter-aligned CSV downloads for admin reports (no PDF).
 */
final class ReportExportService
{
    public function salesInvoicesCsv(AdminReportFilters $f): StreamedResponse
    {
        $name = $this->filename('sales-invoices', $f);

        return response()->streamDownload(function () use ($f): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Invoice number',
                'Company',
                'Company city',
                'Status',
                'Total GBP',
                'Subtotal GBP',
                'Tax GBP',
                'Issued date',
                'Due date',
                'Currency',
                'Record ID',
            ]);

            $q = $this->salesRevenueCohort($f)
                ->with(['company:id,name,city'])
                ->orderByDesc('invoices.issued_on');

            foreach ($q->cursor() as $inv) {
                /** @var Invoice $inv */
                fputcsv($out, [
                    $inv->invoice_number,
                    $inv->company?->name ?? '',
                    $inv->company?->city ?? '',
                    $inv->invoice_status->value,
                    CsvValueFormatter::gbpFromPence((int) $inv->total_pence),
                    CsvValueFormatter::gbpFromPence((int) $inv->subtotal_pence),
                    CsvValueFormatter::gbpFromPence((int) $inv->tax_pence),
                    CsvValueFormatter::dateOnly($inv->issued_on),
                    CsvValueFormatter::dateOnly($inv->due_on),
                    $inv->currency ?? 'GBP',
                    (string) $inv->id,
                ]);
            }

            fclose($out);
        }, $name, $this->csvHeaders($name));
    }

    public function invoicesOutstandingCsv(AdminReportFilters $f): StreamedResponse
    {
        $name = $this->filename('invoices-outstanding', $f);

        return response()->streamDownload(function () use ($f): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Invoice number',
                'Company',
                'Status',
                'Total GBP',
                'Paid to date GBP',
                'Outstanding GBP',
                'Issued date',
                'Due date',
                'Record ID',
            ]);

            $paidSub = Payment::query()
                ->selectRaw('invoice_id, SUM(amount_pence) AS paid_pence')
                ->whereNotNull('invoice_id')
                ->groupBy('invoice_id');

            $q = Invoice::query()
                ->whereBetween('invoices.issued_on', [$f->from->toDateString(), $f->to->toDateString()])
                ->whereCompanyCity($f->city)
                ->when($f->companyId !== null, fn ($q2) => $q2->where('invoices.company_id', $f->companyId))
                ->when($f->invoiceStatus !== null, fn ($q2) => $q2->where('invoices.invoice_status', $f->invoiceStatus))
                ->leftJoinSub($paidSub, 'psum', fn (JoinClause $j): JoinClause => $j->whereColumn('psum.invoice_id', 'invoices.id'))
                ->select('invoices.*')
                ->selectRaw('COALESCE(psum.paid_pence, 0) AS paid_pence_export')
                ->selectRaw(
                    'CASE WHEN invoices.total_pence > COALESCE(psum.paid_pence, 0) '
                    .'THEN invoices.total_pence - COALESCE(psum.paid_pence, 0) ELSE 0 END AS residual_pence_export'
                )
                ->with(['company:id,name'])
                ->orderByDesc('invoices.issued_on');

            foreach ($q->cursor() as $inv) {
                /** @var Invoice $inv */
                $paid = (int) ($inv->paid_pence_export ?? 0);
                $residual = (int) ($inv->residual_pence_export ?? 0);
                fputcsv($out, [
                    $inv->invoice_number,
                    $inv->company?->name ?? '',
                    $inv->invoice_status->value,
                    CsvValueFormatter::gbpFromPence((int) $inv->total_pence),
                    CsvValueFormatter::gbpFromPence($paid),
                    CsvValueFormatter::gbpFromPence($residual),
                    CsvValueFormatter::dateOnly($inv->issued_on),
                    CsvValueFormatter::dateOnly($inv->due_on),
                    (string) $inv->id,
                ]);
            }

            fclose($out);
        }, $name, $this->csvHeaders($name));
    }

    public function paymentsCsv(AdminReportFilters $f): StreamedResponse
    {
        $name = $this->filename('payments', $f);

        return response()->streamDownload(function () use ($f): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Amount GBP',
                'Payment status',
                'Payment method',
                'Paid at UTC',
                'Currency',
                'Invoice number',
                'Company',
                'Reference',
                'Record ID',
            ]);

            $q = $this->paymentsReceivedInPeriod($f)
                ->with([
                    'invoice:id,invoice_number,company_id',
                    'invoice.company:id,name',
                ])
                ->orderByDesc('payments.paid_at');

            foreach ($q->cursor() as $p) {
                /** @var Payment $p */
                fputcsv($out, [
                    CsvValueFormatter::gbpFromPence((int) $p->amount_pence),
                    $p->payment_status->value,
                    $p->payment_method?->value ?? '',
                    CsvValueFormatter::utcDateTime($p->paid_at),
                    $p->currency ?? 'GBP',
                    $p->invoice?->invoice_number ?? '',
                    $p->invoice?->company?->name ?? '',
                    $p->reference ?? '',
                    (string) $p->id,
                ]);
            }

            fclose($out);
        }, $name, $this->csvHeaders($name));
    }

    public function subscriptionsCsv(AdminReportFilters $f): StreamedResponse
    {
        $name = $this->filename('subscriptions', $f);

        return response()->streamDownload(function () use ($f): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Company',
                'Plan name',
                'Status',
                'Renews at',
                'Price snapshot (minor)',
                'Currency',
                'Notes',
                'Record ID',
            ]);

            $q = CompanySubscription::query()
                ->select('company_subscriptions.*')
                ->when($f->companyId !== null, fn ($q2) => $q2->where('company_subscriptions.company_id', $f->companyId))
                ->when($f->subscriptionPlanId !== null, fn ($q2) => $q2->where('company_subscriptions.subscription_plan_id', $f->subscriptionPlanId))
                ->when($f->subscriptionStatus !== null, fn ($q2) => $q2->where('company_subscriptions.status', $f->subscriptionStatus))
                ->with(['company:id,name', 'plan:id,name'])
                ->join('subscription_plans', 'company_subscriptions.subscription_plan_id', '=', 'subscription_plans.id')
                ->orderBy('subscription_plans.name')
                ->orderBy('company_subscriptions.created_at');

            $any = false;
            foreach ($q->cursor() as $row) {
                $any = true;
                fputcsv($out, [
                    $row->company?->name ?? '',
                    $row->plan?->name ?? '',
                    $row->status->value,
                    CsvValueFormatter::dateOnly($row->renews_at),
                    (string) (int) $row->price_amount_minor_snapshot,
                    (string) $row->currency,
                    (string) ($row->notes ?? ''),
                    (string) $row->id,
                ]);
            }

            if (! $any) {
                fputcsv($out, [
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    'No subscription rows for this filter.',
                    '',
                ]);
            }

            fclose($out);
        }, $name, $this->csvHeaders($name));
    }

    public function bookingsCsv(AdminReportFilters $f): StreamedResponse
    {
        $name = $this->filename('bookings', $f);

        return response()->streamDownload(function () use ($f): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Company',
                'Booking status',
                'Service type',
                'Scheduled date',
                'Price estimate GBP',
                'Assigned route',
                'Created at UTC',
                'Record ID',
            ]);

            $q = Booking::query()
                ->whereBetween('bookings.created_at', [$f->from, $f->to])
                ->whereCompanyCity($f->city)
                ->when($f->companyId !== null, fn ($q2) => $q2->where('bookings.company_id', $f->companyId))
                ->when($f->bookingStatus !== null, fn ($q2) => $q2->where('bookings.booking_status', $f->bookingStatus))
                ->with(['company:id,name', 'assignedRoute:id,name,scheduled_date'])
                ->orderByDesc('bookings.created_at');

            foreach ($q->cursor() as $b) {
                /** @var Booking $b */
                fputcsv($out, [
                    $b->company?->name ?? '',
                    $b->booking_status->value,
                    $b->service_type?->value ?? '',
                    CsvValueFormatter::dateOnly($b->scheduled_date),
                    CsvValueFormatter::optionalGbpFromPence($b->price_estimate_pence),
                    $b->assignedRoute?->name ?? '',
                    CsvValueFormatter::utcDateTime($b->created_at),
                    (string) $b->id,
                ]);
            }

            fclose($out);
        }, $name, $this->csvHeaders($name));
    }

    public function ordersCsv(AdminReportFilters $f): StreamedResponse
    {
        $name = $this->filename('orders', $f);

        return response()->streamDownload(function () use ($f): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Company',
                'Order status',
                'Total GBP',
                'Knife count',
                'Route',
                'Created at UTC',
                'Completed at UTC',
                'Record ID',
            ]);

            $q = Order::query()
                ->whereBetween('orders.created_at', [$f->from, $f->to])
                ->whereCompanyCity($f->city)
                ->when($f->companyId !== null, fn ($q2) => $q2->where('orders.company_id', $f->companyId))
                ->when($f->orderStatus !== null, fn ($q2) => $q2->where('orders.order_status', $f->orderStatus))
                ->when($f->routeId !== null, fn ($q2) => $q2->where('orders.route_id', $f->routeId))
                ->with(['company:id,name', 'operationalRoute:id,name'])
                ->orderByDesc('orders.created_at');

            foreach ($q->cursor() as $o) {
                /** @var Order $o */
                fputcsv($out, [
                    $o->company?->name ?? '',
                    $o->order_status->value,
                    CsvValueFormatter::gbpFromPence((int) $o->total_pence),
                    (string) $o->knife_count,
                    $o->operationalRoute?->name ?? '',
                    CsvValueFormatter::utcDateTime($o->created_at),
                    CsvValueFormatter::utcDateTime($o->completed_at),
                    (string) $o->id,
                ]);
            }

            fclose($out);
        }, $name, $this->csvHeaders($name));
    }

    public function routesCsv(AdminReportFilters $f): StreamedResponse
    {
        $name = $this->filename('routes', $f);

        return response()->streamDownload(function () use ($f): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Route name',
                'Status',
                'Scheduled date',
                'Coverage area',
                'Stops total',
                'Stops completed',
                'Failed collections',
                'Completion rate',
                'Driver',
                'Record ID',
            ]);

            $base = $this->routesBase($f);

            $q = (clone $base)
                ->with(['driver:id,name'])
                ->withCount('stops')
                ->withCount(['stops as completed_stops_count' => fn ($q2) => $q2->where('route_stop_status', RouteStopStatus::Completed)])
                ->withCount(['stops as failed_collections_count' => fn ($q2) => $q2->where('route_stop_status', RouteStopStatus::Skipped)])
                ->orderBy('routes.scheduled_date')
                ->orderBy('routes.name');

            foreach ($q->cursor() as $r) {
                /** @var OperationalRoute $r */
                $stops = (int) $r->stops_count;
                $completed = (int) ($r->completed_stops_count ?? 0);
                $rate = $stops > 0 ? number_format($completed / $stops, 4, '.', '') : '';
                fputcsv($out, [
                    $r->name,
                    $r->route_status->value,
                    CsvValueFormatter::dateOnly($r->scheduled_date),
                    $r->coverage_city ?? '',
                    (string) $stops,
                    (string) $completed,
                    (string) (int) ($r->failed_collections_count ?? 0),
                    $rate,
                    $r->driver?->name ?? '',
                    (string) $r->id,
                ]);
            }

            fclose($out);
        }, $name, $this->csvHeaders($name));
    }

    public function knivesCsv(AdminReportFilters $f): StreamedResponse
    {
        $name = $this->filename('knives', $f);

        return response()->streamDownload(function () use ($f): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Company',
                'Knife status',
                'Knife type',
                'Label',
                'Service type',
                'Updated at UTC',
                'Linked order record ID',
                'Record ID',
            ]);

            $q = Knife::query()
                ->tap(fn (Builder $kq) => $this->applyKnifeActivityFilters($kq, $f))
                ->with(['company:id,name', 'booking:id,service_type'])
                ->orderByDesc('knives.updated_at');

            foreach ($q->cursor() as $k) {
                /** @var Knife $k */
                fputcsv($out, [
                    $k->company?->name ?? '',
                    $k->knife_status->value,
                    (string) ($k->knife_type ?? ''),
                    (string) ($k->label ?? ''),
                    $k->booking?->service_type?->value ?? '',
                    CsvValueFormatter::utcDateTime($k->updated_at),
                    $k->order_id !== null ? (string) $k->order_id : '',
                    (string) $k->id,
                ]);
            }

            fclose($out);
        }, $name, $this->csvHeaders($name));
    }

    /** @return Builder<Invoice> */
    private function salesRevenueCohort(AdminReportFilters $f): Builder
    {
        $q = Invoice::query()
            ->whereNotNull('invoices.issued_on')
            ->whereBetween('invoices.issued_on', [$f->from->toDateString(), $f->to->toDateString()])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn (Builder $q2) => $q2->where('invoices.company_id', $f->companyId))
            ->when($f->invoiceStatus !== null, fn (Builder $q2) => $q2->where('invoices.invoice_status', $f->invoiceStatus))
            ->where('invoices.invoice_status', '!=', InvoiceStatus::Void);

        if ($f->invoiceStatus === null) {
            $q->where('invoices.invoice_status', '!=', InvoiceStatus::Draft);
        }

        return $q;
    }

    /** @return Builder<Payment> */
    private function paymentsReceivedInPeriod(AdminReportFilters $f): Builder
    {
        return Payment::query()
            ->whereBetween('payments.paid_at', [$f->from, $f->to])
            ->whereNotNull('payments.invoice_id')
            ->whereNotNull('payments.paid_at')
            ->when($f->companyId !== null, fn (Builder $q) => $q->where('payments.company_id', $f->companyId))
            ->when($f->paymentStatus !== null, fn (Builder $q) => $q->where('payments.payment_status', $f->paymentStatus))
            ->when($f->paymentMethod !== null, fn (Builder $q) => $q->where('payments.payment_method', $f->paymentMethod))
            ->whereHas('invoice', function (Builder $q) use ($f): void {
                $q->whereNotNull('issued_on')
                    ->whereBetween('issued_on', [$f->from->toDateString(), $f->to->toDateString()])
                    ->where('invoice_status', '!=', InvoiceStatus::Void)
                    ->whereCompanyCity($f->city)
                    ->when($f->companyId !== null, fn (Builder $iq) => $iq->where('company_id', $f->companyId))
                    ->when($f->invoiceStatus !== null, fn (Builder $iq) => $iq->where('invoice_status', $f->invoiceStatus));
            });
    }

    /** @return Builder<OperationalRoute> */
    private function routesBase(AdminReportFilters $f): Builder
    {
        return OperationalRoute::query()
            ->whereBetween('routes.scheduled_date', [$f->from->toDateString(), $f->to->toDateString()])
            ->when($f->city !== null && $f->city !== '', fn ($q) => $q->where('routes.coverage_city', $f->city))
            ->when($f->area !== null && $f->area !== '', fn ($q) => $q->where('routes.coverage_city', $f->area))
            ->when($f->routeId !== null, fn ($q) => $q->where('routes.id', $f->routeId))
            ->when($f->driverUserId !== null, fn ($q) => $q->where('routes.driver_user_id', $f->driverUserId))
            ->when($f->routeStatus !== null, fn ($q) => $q->where('routes.route_status', $f->routeStatus))
            ->when(
                $f->failureReason !== null && $f->failureReason !== '',
                fn ($q) => $q->whereExists(function ($sub) use ($f): void {
                    $sub->selectRaw('1')
                        ->from('route_stops')
                        ->whereColumn('route_stops.route_id', 'routes.id')
                        ->where('route_stops.route_stop_status', RouteStopStatus::Skipped->value)
                        ->where('route_stops.failure_reason', $f->failureReason);
                })
            );
    }

    /** @param  Builder<Knife>  $q */
    private function applyKnifeActivityFilters(Builder $q, AdminReportFilters $f): void
    {
        $q->whereBetween('knives.updated_at', [$f->from, $f->to])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn (Builder $q2) => $q2->where('knives.company_id', $f->companyId))
            ->when($f->knifeStatus !== null, fn (Builder $q2) => $q2->where('knives.knife_status', $f->knifeStatus))
            ->when($f->knifeType !== null, fn (Builder $q2) => $q2->where('knives.knife_type', $f->knifeType))
            ->when($f->serviceType !== null, fn (Builder $q2) => $q2->whereHas('booking', fn (Builder $bq) => $bq->where('service_type', $f->serviceType)));
    }

    /** @return array<string, string> */
    private function csvHeaders(string $filename): array
    {
        return [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'no-store, private',
        ];
    }

    private function filename(string $stem, AdminReportFilters $f): string
    {
        $from = $f->from->toDateString();
        $to = $f->to->toDateString();

        return "wesharp-{$stem}-{$from}-{$to}.csv";
    }
}
