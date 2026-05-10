<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Enums\CostAllocationTargetType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\StripeCheckoutAttemptStatus;
use App\Enums\UserRole;
use App\Http\Requests\Admin\SalesPosPerformanceReportRequest;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CostAllocation;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\StripeCheckoutAttempt;
use App\Models\User;
use App\Support\Money\MoneyFormatting;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Sprint 24.5 — sales workflows, POS-like payments, Stripe invoice checkout attempts (with recovery signals).
 */
final class SalesPosPerformanceReportService
{
    private const USER_BREAKDOWN_LIMIT = 40;

    /** @return array<string, mixed> */
    public function build(SalesPosPerformanceReportRequest $request, User $viewer): array
    {
        $tz = config('app.timezone', 'UTC');

        /** @var array<string, mixed> $v */
        $v = $request->validated();

        /** @phpstan-ignore-next-line */
        $to = isset($v['date_to'])
            ? Carbon::parse((string) $v['date_to'], $tz)->endOfDay()
            : Carbon::now($tz)->endOfDay();

        /** @phpstan-ignore-next-line */
        $from = isset($v['date_from'])
            ? Carbon::parse((string) $v['date_from'], $tz)->startOfDay()
            : (clone $to)->copy()->startOfDay()->subDays(90);

        if ($from->gt($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $requestedSalesId = isset($v['sales_user_id']) ? (int) $v['sales_user_id'] : null;
        $scopedSalesUserId = $this->resolveScopedSalesUserId($requestedSalesId, $viewer);

        $salesActorIds = $this->salesActorUserIds($scopedSalesUserId);

        $bookingIds = $this->bookingIdsFromSalesAudits($from, $to, $salesActorIds);
        $orderIds = $this->orderIdsFromSalesAudits($from, $to, $salesActorIds);

        $checkout = $this->checkoutMetrics($from, $to);
        $pos = $this->posPaymentMetrics($from, $to, $scopedSalesUserId);

        $discounts = $this->discountMetrics($orderIds);
        $quotes = $this->quoteEstimateMetrics($bookingIds);

        $allocated = $this->allocatedCostToTouchpoints($from, $to, $orderIds);

        $acquisition = $this->acquisitionMetrics($from, $to, $salesActorIds);

        $usersBreakdown = $this->salesUserBreakdown($from, $to, $scopedSalesUserId);

        return [
            'definitions' => [
                'pos_revenue' => 'Staff-recorded payments with paid_at in the window where payment_method is cash or other (walk-in / terminal proxy). Stripe-hosted settlement is excluded.',
                'sales_created_bookings' => 'Bookings whose creation audit rows were authored by sales staff (booking.created on the booking, or company.booking_created with booking_id payload).',
                'sales_created_orders' => 'Orders whose creation audit rows were authored by sales staff (order.created or order.created_from_booking).',
                'checkout_attempt_statuses' => 'Stripe invoice Checkout sessions (stripe_checkout_attempts): pending, completed, expired — persisted statuses today.',
                'abandoned_checkouts' => 'Operational abandonment funnel proxied by expired sessions without completion (same rows as status=expired until explicit abandoned status exists).',
                'recovered_checkouts' => 'Distinct invoices where a completed checkout attempt occurs after an expired attempt on the same invoice (recovery funnel est.).',
                'recovery_rate' => 'Recovered invoices ÷ max(1, expired attempts started in the window).',
                'discount_reasons' => 'Grouped manual_charge_reason on scoped orders with discount_pence > 0.',
                'quotes_estimates' => 'Booking price_estimate_pence totals for bookings touched by sales creation audits.',
                'allocated_costs' => 'Cost allocations dated in the window targeting scoped orders or their invoices.',
                'sales_follow_ups' => 'stripe_checkout_attempts rows where sales_follow_up_dispatched_at falls in the window.',
                'customer_acquisition' => 'company.created audits by sales staff versus tenant portal registrations (company.self_registered with a portal customer actor).',
            ],
            'filters_applied' => [
                'date_from' => $from->toDateString(),
                'date_to' => $to->toDateString(),
                'sales_user_id' => $scopedSalesUserId !== null ? (string) $scopedSalesUserId : null,
                'viewer_scope' => $this->scopeLabel($viewer),
            ],
            'kpis' => array_merge([
                'sales_created_bookings_distinct_count' => count($bookingIds),
                'sales_created_orders_distinct_count' => count($orderIds),
            ], $checkout['kpis'], $pos['kpis'], $discounts['kpis'], $quotes['kpis'], $allocated['kpis'], $acquisition['kpis']),
            'checkout' => $checkout['detail'],
            'pos_payments' => $pos['detail'],
            'discounts' => $discounts['detail'],
            'quotes_and_estimates' => $quotes['detail'],
            'allocated_costs' => $allocated['detail'],
            'customer_acquisition' => $acquisition['detail'],
            'sales_follow_ups' => [
                'dispatched_in_period_count' => $checkout['follow_ups_dispatched'],
                'formatted_follow_up_dispatch_note' => 'Counts checkout attempts where sales_follow_up_dispatched_at is within the filter window.',
            ],
            'sales_user_performance' => $usersBreakdown,
            'sales_user_performance_scope_note' => $scopedSalesUserId !== null ? 'Per-user leaderboard hidden while scoped to a single sales user.' : null,
            'disclaimer' => 'Figures attribute revenue via operational proxies (payments + audits). They do not replace PSP settlement reporting.',
        ];
    }

    private function scopeLabel(User $viewer): string
    {
        return $viewer->role === UserRole::Sales ? 'sales_self_only' : 'full_org';
    }

    private function resolveScopedSalesUserId(?int $requestedId, User $viewer): ?int
    {
        $role = $viewer->role;
        $canSeeAll = $role === UserRole::SuperAdmin
            || $role === UserRole::Admin
            || $role === UserRole::Finance
            || $role === UserRole::Developer;

        if ($role === UserRole::Sales && ! $canSeeAll) {
            return (int) $viewer->id;
        }

        return $requestedId;
    }

    /** @return list<int> */
    private function salesActorUserIds(?int $scopedSalesUserId): array
    {
        $q = User::query()->where('role', UserRole::Sales);

        if ($scopedSalesUserId !== null) {
            $q->whereKey($scopedSalesUserId);
        }

        return $q->pluck('id')->map(static fn ($id): int => (int) $id)->values()->all();
    }

    /**
     * @param  list<int>  $salesActorIds
     * @return list<string>
     */
    private function bookingIdsFromSalesAudits(Carbon $from, Carbon $to, array $salesActorIds): array
    {
        if ($salesActorIds === []) {
            return [];
        }

        $ids = AuditLog::query()
            ->whereBetween('created_at', [$from, $to])
            ->where('action', 'booking.created')
            ->where('auditable_type', Booking::class)
            ->whereIn('actor_id', $salesActorIds)
            ->pluck('auditable_id')
            ->map(static fn ($id): string => (string) $id)
            ->all();

        $payloadIds = AuditLog::query()
            ->whereBetween('created_at', [$from, $to])
            ->where('action', 'company.booking_created')
            ->whereIn('actor_id', $salesActorIds)
            ->get(['payload']);

        foreach ($payloadIds as $row) {
            /** @var array<string, mixed>|null $p */
            $p = $row->payload;
            if (isset($p['booking_id']) && is_string($p['booking_id'])) {
                $ids[] = $p['booking_id'];
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * @param  list<int>  $salesActorIds
     * @return list<string>
     */
    private function orderIdsFromSalesAudits(Carbon $from, Carbon $to, array $salesActorIds): array
    {
        if ($salesActorIds === []) {
            return [];
        }

        return AuditLog::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('action', ['order.created', 'order.created_from_booking'])
            ->where('auditable_type', Order::class)
            ->whereIn('actor_id', $salesActorIds)
            ->pluck('auditable_id')
            ->map(static fn ($id): string => (string) $id)
            ->unique()
            ->values()
            ->all();
    }

    /** @return array{kpis: array<string, mixed>, detail: array<string, mixed>, follow_ups_dispatched: int} */
    private function checkoutMetrics(Carbon $from, Carbon $to): array
    {
        $base = StripeCheckoutAttempt::query()->whereBetween('created_at', [$from, $to]);

        $pending = (int) (clone $base)->where('status', StripeCheckoutAttemptStatus::Pending)->count();
        $completed = (int) (clone $base)->where('status', StripeCheckoutAttemptStatus::Completed)->count();
        $expired = (int) (clone $base)->where('status', StripeCheckoutAttemptStatus::Expired)->count();

        $followUps = (int) StripeCheckoutAttempt::query()
            ->whereBetween('sales_follow_up_dispatched_at', [$from, $to])
            ->whereNotNull('sales_follow_up_dispatched_at')
            ->count();

        $recoveredInvoices = (int) (DB::table('stripe_checkout_attempts as completed')
            ->join('stripe_checkout_attempts as expired', 'expired.invoice_id', '=', 'completed.invoice_id')
            ->where('completed.status', StripeCheckoutAttemptStatus::Completed->value)
            ->where('expired.status', StripeCheckoutAttemptStatus::Expired->value)
            ->whereColumn('expired.expired_at', '<', 'completed.completed_at')
            ->whereBetween('completed.completed_at', [$from, $to])
            ->selectRaw('COUNT(DISTINCT completed.invoice_id) AS c')
            ->value('c') ?? 0);

        $recoveryDenom = max(1, $expired);
        $recoveryRate = round($recoveredInvoices / $recoveryDenom, 4);

        $recoveredRevenueRow = DB::selectOne(
            'SELECT COALESCE(SUM(amount_pence), 0) AS s FROM (
                SELECT MAX(completed.amount_pence) AS amount_pence
                FROM stripe_checkout_attempts AS completed
                INNER JOIN stripe_checkout_attempts AS expired ON expired.invoice_id = completed.invoice_id
                WHERE completed.status = ?
                  AND expired.status = ?
                  AND expired.expired_at < completed.completed_at
                  AND completed.completed_at BETWEEN ? AND ?
                GROUP BY completed.invoice_id
            ) AS recovered_rows',
            [
                StripeCheckoutAttemptStatus::Completed->value,
                StripeCheckoutAttemptStatus::Expired->value,
                $from->toDateTimeString(),
                $to->toDateTimeString(),
            ]
        );

        $recoveredRevenue = (int) ($recoveredRevenueRow->s ?? 0);

        return [
            'follow_ups_dispatched' => $followUps,
            'kpis' => [
                'stripe_checkout_attempts_pending' => $pending,
                'stripe_checkout_attempts_completed' => $completed,
                'stripe_checkout_attempts_expired' => $expired,
                'abandoned_checkouts_proxy_count' => $expired,
                'recovered_checkout_invoices_count' => $recoveredInvoices,
                'checkout_recovery_rate' => $recoveryRate,
                'recovered_checkout_revenue_pence' => $recoveredRevenue,
                'formatted_recovered_checkout_revenue' => MoneyFormatting::formatGbpFromPence($recoveredRevenue),
            ],
            'detail' => [
                'status_counts' => [
                    StripeCheckoutAttemptStatus::Pending->value => $pending,
                    StripeCheckoutAttemptStatus::Completed->value => $completed,
                    StripeCheckoutAttemptStatus::Expired->value => $expired,
                ],
                'status_definitions_note' => 'Roadmap also lists abandoned/recovered — recovered is derived; abandoned maps to expired sessions until distinct statuses are persisted.',
            ],
        ];
    }

    /**
     * @return array{kpis: array<string, mixed>, detail: array<string, mixed>}
     */
    private function posPaymentMetrics(Carbon $from, Carbon $to, ?int $scopedSalesUserId): array
    {
        $methods = [PaymentMethod::Cash->value, PaymentMethod::Other->value];

        $base = Payment::query()
            ->whereBetween('paid_at', [$from, $to])
            ->where('payment_status', PaymentStatus::Paid)
            ->whereIn('payment_method', $methods);

        if ($scopedSalesUserId !== null) {
            $base->where('recorded_by', $scopedSalesUserId);
        }

        $count = (int) (clone $base)->count();
        $sum = (int) (clone $base)->sum('amount_pence');
        $avg = $count > 0 ? (int) round($sum / $count) : 0;

        return [
            'kpis' => [
                'pos_like_payment_count' => $count,
                'pos_like_revenue_pence' => $sum,
                'formatted_pos_like_revenue' => MoneyFormatting::formatGbpFromPence($sum),
                'average_pos_like_payment_pence' => $avg,
                'formatted_average_pos_like_payment' => MoneyFormatting::formatGbpFromPence($avg),
            ],
            'detail' => [
                'payment_methods_included' => $methods,
                'scoped_to_recorded_by' => $scopedSalesUserId !== null,
            ],
        ];
    }

    /** @param  list<string>  $orderIds */
    private function discountMetrics(array $orderIds): array
    {
        if ($orderIds === []) {
            return [
                'kpis' => [
                    'scoped_orders_discount_total_pence' => 0,
                    'formatted_scoped_orders_discount_total' => MoneyFormatting::formatGbpFromPence(0),
                ],
                'detail' => ['reason_breakdown' => []],
            ];
        }

        $total = (int) Order::query()->whereIn('id', $orderIds)->sum('discount_pence');

        $reasonRows = Order::query()
            ->whereIn('id', $orderIds)
            ->where('discount_pence', '>', 0)
            ->selectRaw('COALESCE(NULLIF(TRIM(manual_charge_reason), ""), "(no reason captured)") AS reason_bucket')
            ->selectRaw('SUM(discount_pence) AS sum_pence')
            ->groupBy('reason_bucket')
            ->orderByDesc('sum_pence')
            ->limit(40)
            ->get();

        $breakdown = [];

        foreach ($reasonRows as $row) {
            $pence = (int) $row->sum_pence;
            $breakdown[] = [
                'reason' => (string) $row->reason_bucket,
                'discount_pence' => $pence,
                'formatted_discount' => MoneyFormatting::formatGbpFromPence($pence),
            ];
        }

        return [
            'kpis' => [
                'scoped_orders_discount_total_pence' => $total,
                'formatted_scoped_orders_discount_total' => MoneyFormatting::formatGbpFromPence($total),
            ],
            'detail' => ['reason_breakdown' => $breakdown],
        ];
    }

    /** @param  list<string>  $bookingIds */
    private function quoteEstimateMetrics(array $bookingIds): array
    {
        if ($bookingIds === []) {
            return [
                'kpis' => [
                    'booking_price_estimate_total_pence' => 0,
                    'formatted_booking_price_estimate_total' => MoneyFormatting::formatGbpFromPence(0),
                    'bookings_with_price_estimate_count' => 0,
                ],
                'detail' => [],
            ];
        }

        $bookingScoped = Booking::query()->whereIn('id', $bookingIds)->where('price_estimate_pence', '>', 0);
        $estimateSum = (int) (clone $bookingScoped)->sum('price_estimate_pence');
        $estimateCount = (int) (clone $bookingScoped)->count();

        return [
            'kpis' => [
                'booking_price_estimate_total_pence' => $estimateSum,
                'formatted_booking_price_estimate_total' => MoneyFormatting::formatGbpFromPence($estimateSum),
                'bookings_with_price_estimate_count' => $estimateCount,
            ],
            'detail' => [
                'note' => 'Uses CRM/admin booking price_estimate_pence — not a formal quotes subsystem.',
            ],
        ];
    }

    /** @param  list<string>  $orderIds */
    private function allocatedCostToTouchpoints(Carbon $from, Carbon $to, array $orderIds): array
    {
        if ($orderIds === []) {
            return [
                'kpis' => [
                    'allocated_cost_to_scoped_orders_and_invoices_pence' => 0,
                    'formatted_allocated_cost_to_scoped_orders_and_invoices' => MoneyFormatting::formatGbpFromPence(0),
                ],
                'detail' => ['note' => 'No scoped sales-attributed orders in window — allocation KPI is zero.'],
            ];
        }

        $invoiceIds = Invoice::query()->whereIn('order_id', $orderIds)->pluck('id')->map(static fn ($id): string => (string) $id)->values()->all();

        $sum = (int) CostAllocation::query()
            ->whereBetween('created_at', [$from, $to])
            ->where(function ($q) use ($orderIds, $invoiceIds): void {
                $q->where(function ($q2) use ($orderIds): void {
                    $q2->where('target_type', CostAllocationTargetType::Order)
                        ->whereIn('target_id', $orderIds);
                });

                if ($invoiceIds !== []) {
                    $q->orWhere(function ($q2) use ($invoiceIds): void {
                        $q2->where('target_type', CostAllocationTargetType::Invoice)
                            ->whereIn('target_id', $invoiceIds);
                    });
                }
            })
            ->sum('amount_pence');

        return [
            'kpis' => [
                'allocated_cost_to_scoped_orders_and_invoices_pence' => $sum,
                'formatted_allocated_cost_to_scoped_orders_and_invoices' => MoneyFormatting::formatGbpFromPence($sum),
            ],
            'detail' => [
                'scoped_order_count' => count($orderIds),
                'scoped_invoice_count' => count($invoiceIds),
            ],
        ];
    }

    /**
     * @param  list<int>  $salesActorIds
     * @return array{kpis: array<string, mixed>, detail: array<string, mixed>}
     */
    private function acquisitionMetrics(Carbon $from, Carbon $to, array $salesActorIds): array
    {
        $salesCompanies = 0;

        if ($salesActorIds !== []) {
            $salesCompanies = (int) AuditLog::query()
                ->whereBetween('created_at', [$from, $to])
                ->where('action', 'company.created')
                ->where('auditable_type', Company::class)
                ->whereIn('actor_id', $salesActorIds)
                ->count();
        }

        $portalSelfServe = (int) AuditLog::query()
            ->whereBetween('created_at', [$from, $to])
            ->where('action', 'company.self_registered')
            ->whereHas('actor', static function ($q): void {
                $q->whereIn('role', [UserRole::CustomerOwner->value, UserRole::CustomerStaff->value]);
            })
            ->count();

        return [
            'kpis' => [
                'companies_created_by_sales_staff_count' => $salesCompanies,
                'companies_self_registered_portal_count' => $portalSelfServe,
            ],
            'detail' => [
                'sales_staff_company_creates' => 'Counts audit action company.created by users in the sales role cohort for this scope.',
                'portal_self_registered' => 'Counts audit action company.self_registered where the actor is a portal customer role.',
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function salesUserBreakdown(Carbon $from, Carbon $to, ?int $scopedSalesUserId): array
    {
        if ($scopedSalesUserId !== null) {
            return [];
        }

        $salesIds = User::query()->where('role', UserRole::Sales)->pluck('id')->map(static fn ($id): int => (int) $id)->values()->all();

        if ($salesIds === []) {
            return [];
        }

        $counts = AuditLog::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('actor_id', $salesIds)
            ->whereIn('action', [
                'booking.created',
                'company.booking_created',
                'order.created',
                'order.created_from_booking',
                'company.created',
            ])
            ->selectRaw('actor_id')
            ->selectRaw('action')
            ->selectRaw('COUNT(*) AS c')
            ->groupBy('actor_id', 'action')
            ->get();

        $map = [];

        foreach ($counts as $row) {
            $aid = (int) $row->actor_id;
            if (! isset($map[$aid])) {
                $map[$aid] = [
                    'bookings_created' => 0,
                    'orders_created' => 0,
                    'companies_created' => 0,
                ];
            }

            $action = (string) $row->action;
            $c = (int) $row->c;

            if ($action === 'booking.created' || $action === 'company.booking_created') {
                $map[$aid]['bookings_created'] += $c;
            }

            if ($action === 'order.created' || $action === 'order.created_from_booking') {
                $map[$aid]['orders_created'] += $c;
            }

            if ($action === 'company.created') {
                $map[$aid]['companies_created'] += $c;
            }
        }

        $posRevenue = Payment::query()
            ->whereBetween('paid_at', [$from, $to])
            ->where('payment_status', PaymentStatus::Paid)
            ->whereIn('payment_method', [PaymentMethod::Cash->value, PaymentMethod::Other->value])
            ->whereIn('recorded_by', $salesIds)
            ->groupBy('recorded_by')
            ->selectRaw('recorded_by AS uid')
            ->selectRaw('SUM(amount_pence) AS s')
            ->pluck('s', 'uid');

        $names = User::query()->whereIn('id', $salesIds)->pluck('name', 'id');

        $rows = [];

        foreach ($salesIds as $sid) {
            $m = $map[$sid] ?? ['bookings_created' => 0, 'orders_created' => 0, 'companies_created' => 0];
            $rev = (int) ($posRevenue[$sid] ?? 0);

            $rows[] = [
                'sales_user_id' => $sid,
                'sales_user_name' => (string) ($names[$sid] ?? ''),
                'bookings_created_count' => $m['bookings_created'],
                'orders_created_count' => $m['orders_created'],
                'companies_created_count' => $m['companies_created'],
                'pos_like_revenue_pence' => $rev,
                'formatted_pos_like_revenue' => MoneyFormatting::formatGbpFromPence($rev),
            ];
        }

        usort($rows, static fn (array $a, array $b): int => ($b['pos_like_revenue_pence'] ?? 0) <=> ($a['pos_like_revenue_pence'] ?? 0));

        return array_slice($rows, 0, self::USER_BREAKDOWN_LIMIT);
    }
}
