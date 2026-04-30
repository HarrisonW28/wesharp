<?php

namespace App\Services\Analytics;

use App\Enums\InvoiceStatus;
use App\Enums\OrderStatus;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\Payment;
use App\Support\Analytics\AnalyticsSql;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

final class AnalyticsService
{
    /** @return array<string, mixed> */
    public function overview(?string $city, CarbonInterface $from, CarbonInterface $to): array
    {
        $now = Carbon::now('UTC');
        $monthStart = $now->clone()->startOfMonth();
        $monthEnd = $now->clone()->endOfMonth();
        $weekStart = $now->clone()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $now->clone()->endOfWeek(Carbon::SUNDAY);

        $revMonth = (int) Order::completed()->whereCompanyCity($city)
            ->whereBetween('orders.updated_at', [$monthStart, $monthEnd])
            ->sum('total_pence');

        $revWeek = (int) Order::completed()->whereCompanyCity($city)
            ->whereBetween('orders.updated_at', [$weekStart, $weekEnd])
            ->sum('total_pence');

        $knivesWeek = Knife::sharpenedThroughput()->whereCompanyCity($city)
            ->whereBetween('knives.updated_at', [$weekStart, $weekEnd])
            ->count();

        $avgRow = Order::completed()->whereCompanyCity($city)
            ->whereBetween('orders.updated_at', [$from, $to])
            ->selectRaw('SUM(orders.total_pence) AS tp, SUM(orders.knife_count) AS kc')
            ->first();
        $tp = (int) ($avgRow->tp ?? 0);
        $kc = (int) ($avgRow->kc ?? 0);
        $avgPricePerKnife = $kc > 0 ? (int) floor($tp / $kc) : 0;

        $activeCustomers = Company::query()->analyticsActive()
            ->when($city !== null && $city !== '', fn ($q) => $q->where('city', $city))
            ->count();

        $receivedSub = Payment::query()
            ->selectRaw('invoice_id, SUM(amount_pence) AS paid_pence')
            ->whereNotNull('invoice_id')
            ->groupBy('invoice_id');

        $outstandingCount = Invoice::query()->outstanding()->whereCompanyCity($city)->count();

        $outstandingAmount = (int) Invoice::query()
            ->outstanding()
            ->whereCompanyCity($city)
            ->leftJoinSub($receivedSub, 'ipsum', fn (JoinClause $j): JoinClause => $j->whereColumn(
                'ipsum.invoice_id',
                'invoices.id'
            ))
            ->sum(DB::raw('invoices.total_pence - COALESCE(ipsum.paid_pence, 0)'));

        return [
            'kpis' => [
                'revenue_this_month_pence' => $revMonth,
                'revenue_this_week_pence' => $revWeek,
                'knives_sharpened_this_week' => $knivesWeek,
                'average_price_per_knife_pence' => $avgPricePerKnife,
                'active_customers' => $activeCustomers,
                'outstanding_invoice_count' => $outstandingCount,
                'outstanding_invoice_amount_pence' => $outstandingAmount,
                'overdue_amount_pence' => $this->overdueOutstandingAmountPence($city),
                'new_bookings_this_week' => Booking::query()->whereCompanyCity($city)
                    ->whereBetween('bookings.created_at', [$weekStart, $weekEnd])
                    ->count(),
            ],
            'distinct_cities' => $this->distinctCities(),
            'filters' => [
                'city' => $city,
                'date_from' => $from->copy()->utc()->startOfDay()->toDateString(),
                'date_to' => $to->copy()->utc()->startOfDay()->toDateString(),
            ],
            'basis' => [
                'revenue' => 'Sum of orders.total_pence for completed orders within each time window using orders.updated_at.',
                'average_price_per_knife' => 'SUM(total_pence) divided by SUM(knife_count) on completed orders in filters date_from…date_to.',
                'invoice_balances' => 'invoice totals minus summed payment rows on invoices (payments.invoice_id).',
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function sales(?string $city, CarbonInterface $from, CarbonInterface $to): array
    {
        $dayExpr = AnalyticsSql::dateDay('orders.updated_at');

        $revenueDaily = Order::completed()->whereCompanyCity($city)
            ->whereBetween('orders.updated_at', [$from, $to])
            ->selectRaw("{$dayExpr} AS bucket, SUM(orders.total_pence) AS revenue_pence")
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(static fn ($r): array => [
                'date' => (string) $r->bucket,
                'revenue_pence' => (int) $r->revenue_pence,
            ]);

        $revenueByCity = Order::completed()->whereCompanyCity($city)
            ->join('companies', 'companies.id', '=', 'orders.company_id')
            ->whereBetween('orders.updated_at', [$from, $to])
            ->whereNotNull('companies.city')
            ->where('companies.city', '!=', '')
            ->groupBy('companies.city')
            ->selectRaw('companies.city AS city_name, SUM(orders.total_pence) AS revenue_pence')
            ->orderByDesc('revenue_pence')
            ->limit(25)
            ->get()
            ->map(static fn ($r): array => [
                'city' => (string) $r->city_name,
                'revenue_pence' => (int) $r->revenue_pence,
            ]);

        $topCustomers = Order::completed()->whereCompanyCity($city)
            ->join('companies', 'companies.id', '=', 'orders.company_id')
            ->whereBetween('orders.updated_at', [$from, $to])
            ->groupBy('companies.id', 'companies.name', 'companies.city')
            ->selectRaw(
                <<<'SQL'
                companies.id AS company_id,
                companies.name AS company_name,
                companies.city AS city,
                SUM(orders.total_pence) AS revenue_pence
                SQL,
            )->orderByDesc('revenue_pence')
            ->limit(10)
            ->get()
            ->map(static fn ($r): array => [
                'company_id' => (string) $r->company_id,
                'company_name' => (string) $r->company_name,
                'city' => $r->city !== null ? (string) $r->city : null,
                'revenue_pence' => (int) $r->revenue_pence,
            ]);

        $receivedSub = Payment::query()
            ->selectRaw('invoice_id, SUM(amount_pence) AS paid_pence')
            ->whereNotNull('invoice_id')
            ->groupBy('invoice_id');

        $paidInRange = Invoice::query()->whereCompanyCity($city)
            ->where('invoice_status', InvoiceStatus::Paid)
            ->whereBetween('created_at', [$from, $to]);

        $openInRange = Invoice::query()->whereCompanyCity($city)
            ->outstanding()
            ->whereBetween('created_at', [$from, $to])
            ->leftJoinSub($receivedSub, 'psum', fn (JoinClause $j): JoinClause => $j->whereColumn(
                'psum.invoice_id',
                'invoices.id'
            ));

        return [
            'revenue_daily' => $revenueDaily->values()->all(),
            'revenue_by_city' => $revenueByCity->values()->all(),
            'top_customers_by_spend' => $topCustomers->values()->all(),
            'paid_vs_open_invoices' => [
                'paid_full' => [
                    'invoice_count' => $paidInRange->count(),
                    'billed_amount_pence' => (int) $paidInRange->sum('total_pence'),
                ],
                'open_residual' => [
                    'invoice_count' => (clone $openInRange)->count(),
                    'balance_pence' => (int) (clone $openInRange)->sum(DB::raw(
                        '(CASE WHEN COALESCE(psum.paid_pence, 0) < invoices.total_pence '
                        .'THEN invoices.total_pence - COALESCE(psum.paid_pence, 0) ELSE 0 END)'
                    )),
                ],
            ],
            'filters' => [
                'city' => $city,
                'date_from' => $from->copy()->utc()->startOfDay()->toDateString(),
                'date_to' => $to->copy()->utc()->startOfDay()->toDateString(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function routes(?string $city, CarbonInterface $from, CarbonInterface $to): array
    {
        $qb = OperationalRoute::query()->whereBetween('routes.scheduled_date', [$from->toDateString(), $to->toDateString()])
            ->join('orders', 'orders.route_id', '=', 'routes.id')
            ->where('orders.order_status', OrderStatus::Completed)
            /** @phpstan-ignore-next-line */
            ->whereBetween('orders.updated_at', [$from, $to])
            ->whereNotNull('routes.coverage_city')
            /** @phpstan-ignore-next-line */
            ->when($city !== null && $city !== '', fn ($q) => $q->where('routes.coverage_city', $city))
            ->groupBy('routes.coverage_city')
            ->selectRaw('routes.coverage_city AS city, SUM(orders.total_pence) AS route_order_revenue_pence');

        /** @phpstan-ignore-next-line */
        $rows = $qb->orderByDesc('route_order_revenue_pence')->get();

        /** @phpstan-ignore-next-line */
        return [
            /** @phpstan-ignore-next-line */
            'route_value_by_city' => $rows->map(static fn ($r): array => [
                /** @phpstan-ignore-next-line */
                'city' => (string) $r->city,
                /** @phpstan-ignore-next-line */
                'revenue_pence' => (int) $r->route_order_revenue_pence,
            ]
            )->values()->all(),
            'filters' => [
                /** @phpstan-ignore-next-line */
                'city' => $city,
                /** @phpstan-ignore-next-line */
                'date_from' => $from->copy()->utc()->startOfDay()->toDateString(),
                /** @phpstan-ignore-next-line */
                'date_to' => $to->copy()->utc()->startOfDay()->toDateString(),
            ],
            'basis' => [
                /** @phpstan-ignore-next-line */
                'aggregation' => 'Sum of orders.total_pence for completed orders linked via orders.route_id, grouped by routes.coverage_city.',
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function operations(?string $city, CarbonInterface $from, CarbonInterface $to): array
    {
        $wk = AnalyticsSql::weekBucket('knives.updated_at');

        /** @phpstan-ignore-next-line */
        $knifeWeeks = Knife::sharpenedThroughput()->whereCompanyCity($city)
            /** @phpstan-ignore-next-line */
            ->whereBetween('knives.updated_at', [$from, $to])
            /** @phpstan-ignore-next-line */
            ->selectRaw("{$wk} AS iso_week_label, COUNT(*) AS knife_count")
            /** @phpstan-ignore-next-line */
            ->groupBy('iso_week_label')
            /** @phpstan-ignore-next-line */
            ->orderBy('iso_week_label')
            /** @phpstan-ignore-next-line */
            ->get();

        /** @phpstan-ignore-next-line */
        $bookingsStatus = Booking::query()->whereCompanyCity($city)
            /** @phpstan-ignore-next-line */
            ->whereBetween('created_at', [$from, $to])
            /** @phpstan-ignore-next-line */
            ->selectRaw(
                /** @phpstan-ignore-next-line */
                'booking_status AS status_value, COUNT(*) AS booking_count'
            )
            /** @phpstan-ignore-next-line */
            ->groupBy('booking_status')
            /** @phpstan-ignore-next-line */
            ->orderBy('booking_status')
            /** @phpstan-ignore-next-line */
            ->get();

        /** @phpstan-ignore-next-line */
        return [
            /** @phpstan-ignore-next-line */
            'knives_sharpened_by_week' => $knifeWeeks->map(static fn ($r): array => [
                /** @phpstan-ignore-next-line */
                'week' => (string) $r->iso_week_label,
                /** @phpstan-ignore-next-line */
                'knife_count' => (int) $r->knife_count,
            ])->values()->all(),
            /** @phpstan-ignore-next-line */
            'bookings_by_status' => $bookingsStatus->map(static fn ($r): array => [
                /** @phpstan-ignore-next-line */
                'status' => (string) $r->status_value,
                /** @phpstan-ignore-next-line */
                'count' => (int) $r->booking_count,
            ])->values()->all(),
            'filters' => [
                /** @phpstan-ignore-next-line */
                'city' => $city,
                /** @phpstan-ignore-next-line */
                'date_from' => $from->copy()->utc()->startOfDay()->toDateString(),
                /** @phpstan-ignore-next-line */
                'date_to' => $to->copy()->utc()->startOfDay()->toDateString(),
            ],
        ];
    }

    /** @return list<string> */
    private function distinctCities(): array
    {
        /** @phpstan-ignore-next-line */
        return Company::query()
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->orderBy('city')
            ->limit(200)
            ->pluck('city')
            ->values()
            ->all();
    }

    private function overdueOutstandingAmountPence(?string $city): int
    {
        $today = Carbon::today('UTC')->format('Y-m-d');

        $receivedSub = Payment::query()
            ->selectRaw('invoice_id, SUM(amount_pence) AS paid_pence')
            ->whereNotNull('invoice_id')
            ->groupBy('invoice_id');

        return (int) Invoice::query()
            ->outstanding()
            ->whereCompanyCity($city)
            ->where(static function (EloquentBuilder $q) use ($today): void {
                $q->where('invoice_status', InvoiceStatus::Overdue)
                    ->orWhere(static function (EloquentBuilder $inner) use ($today): void {
                        $inner->where('invoice_status', InvoiceStatus::Sent)
                            ->whereNotNull('due_on')
                            ->whereDate('due_on', '<', $today);
                    });
            })
            /** @phpstan-ignore-next-line */
            ->leftJoinSub($receivedSub, 'psum', fn (JoinClause $j): JoinClause => $j->whereColumn('psum.invoice_id', 'invoices.id'))
            /** @phpstan-ignore-next-line */
            ->sum(DB::raw(
                '(CASE WHEN COALESCE(psum.paid_pence, 0) < invoices.total_pence '
                /** @phpstan-ignore-next-line */
                .'THEN invoices.total_pence - COALESCE(psum.paid_pence, 0) ELSE 0 END)'
            ));
    }
}
