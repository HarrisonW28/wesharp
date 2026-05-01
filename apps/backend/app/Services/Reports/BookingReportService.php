<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Support\Analytics\AnalyticsSql;
use App\Support\Reports\ReportEnvelope;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

final class BookingReportService
{
    private const RECENT_LIMIT = 25;

    /** Terminal / closed booking states for pipeline snapshot. */
    private const TERMINAL_STATUSES = [
        BookingStatus::Cancelled,
        BookingStatus::Completed,
        BookingStatus::ConvertedToOrder,
        BookingStatus::NoShow,
    ];

    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $createdBase = Booking::query()
            ->whereBetween('bookings.created_at', [$f->from, $f->to])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('bookings.company_id', $f->companyId))
            ->when($f->bookingStatus !== null, fn ($q) => $q->where('bookings.booking_status', $f->bookingStatus));

        $bookingsCreatedCount = (int) (clone $createdBase)->count();

        $cancelledInPeriod = (int) Booking::query()
            ->where('bookings.booking_status', BookingStatus::Cancelled)
            ->whereBetween('bookings.updated_at', [$f->from, $f->to])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('bookings.company_id', $f->companyId))
            ->when($f->bookingStatus !== null, fn ($q) => $q->where('bookings.booking_status', $f->bookingStatus))
            ->count();

        $confirmedInPeriod = (int) Booking::query()
            ->where('bookings.booking_status', BookingStatus::Confirmed)
            ->whereBetween('bookings.updated_at', [$f->from, $f->to])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('bookings.company_id', $f->companyId))
            ->when($f->bookingStatus !== null, fn ($q) => $q->where('bookings.booking_status', $f->bookingStatus))
            ->count();

        $convertedInPeriod = (int) Booking::query()
            ->where('bookings.booking_status', BookingStatus::ConvertedToOrder)
            ->whereBetween('bookings.updated_at', [$f->from, $f->to])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('bookings.company_id', $f->companyId))
            ->when($f->bookingStatus !== null, fn ($q) => $q->where('bookings.booking_status', $f->bookingStatus))
            ->count();

        $completedBookingInPeriod = (int) Booking::query()
            ->where('bookings.booking_status', BookingStatus::Completed)
            ->whereBetween('bookings.updated_at', [$f->from, $f->to])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('bookings.company_id', $f->companyId))
            ->when($f->bookingStatus !== null, fn ($q) => $q->where('bookings.booking_status', $f->bookingStatus))
            ->count();

        $pendingPipeline = Booking::query()
            ->whereNotIn('bookings.booking_status', array_map(static fn (BookingStatus $s): string => $s->value, self::TERMINAL_STATUSES))
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('bookings.company_id', $f->companyId))
            ->when($f->bookingStatus !== null, fn ($q) => $q->where('bookings.booking_status', $f->bookingStatus));

        $pendingBookingsCount = (int) (clone $pendingPipeline)->count();

        $auditConfirmedQuery = DB::table('audit_logs')
            ->join('bookings', 'bookings.id', '=', 'audit_logs.auditable_id')
            ->join('companies', 'companies.id', '=', 'bookings.company_id')
            ->where('audit_logs.auditable_type', Booking::class)
            ->where('audit_logs.action', 'booking.confirmed')
            ->whereBetween('audit_logs.created_at', [$f->from, $f->to])
            ->when($f->companyId !== null, fn ($q) => $q->where('bookings.company_id', $f->companyId))
            ->when($f->bookingStatus !== null, fn ($q) => $q->where('bookings.booking_status', $f->bookingStatus))
            ->when($f->city !== null && $f->city !== '', fn ($q) => $q->where('companies.city', $f->city));

        $auditConfirmedCount = (int) (clone $auditConfirmedQuery)->count();

        $avgHoursToConfirm = $this->averageHoursBookingCreatedToConfirmAudit($auditConfirmedQuery);

        $dayExpr = AnalyticsSql::dateDay('bookings.created_at');
        $bookingsByDay = (clone $createdBase)
            ->selectRaw("{$dayExpr} AS bucket, COUNT(*) AS c")
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(static fn ($r): array => [
                'date' => (string) $r->bucket,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $statusBreakdown = (clone $createdBase)
            ->selectRaw(
                'booking_status AS status_value, COUNT(*) AS c, COALESCE(SUM(bookings.price_estimate_pence), 0) AS price_estimate_pence_sum'
            )
            ->groupBy('booking_status')
            ->orderBy('booking_status')
            ->get()
            ->map(static fn ($r): array => [
                'status' => (string) $r->status_value,
                'count' => (int) $r->c,
                'price_estimate_pence_sum' => (int) $r->price_estimate_pence_sum,
            ])
            ->values()
            ->all();

        $bookingsTablePage = $f->bookingsPage ?? $f->page;

        $paginator = (clone $createdBase)
            ->with(['company:id,name', 'assignedRoute:id,name,scheduled_date'])
            ->orderByDesc('bookings.created_at')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $bookingsTablePage);

        $rows = collect($paginator->items())->map(static function ($b): array {
            /** @var Booking $b */
            return [
                'id' => (string) $b->id,
                'booking_status' => $b->booking_status->value,
                'scheduled_date' => $b->scheduled_date?->toDateString(),
                'company_name' => $b->company?->name,
                'route_name' => $b->assignedRoute?->name,
            ];
        })->values()->all();

        $recent = (clone $createdBase)
            ->with(['company:id,name', 'assignedRoute:id,name'])
            ->orderByDesc('bookings.created_at')
            ->limit(self::RECENT_LIMIT)
            ->get()
            ->map(static function (Booking $b): array {
                return [
                    'id' => (string) $b->id,
                    'booking_status' => $b->booking_status->value,
                    'scheduled_date' => $b->scheduled_date?->toDateString(),
                    'created_at' => $b->created_at?->toIso8601String(),
                    'company_name' => $b->company?->name,
                ];
            })
            ->values()
            ->all();

        $envelope = ReportEnvelope::make(
            'bookings',
            $f->toArray(),
            [
                'bookings_created_count' => $bookingsCreatedCount,
                'bookings_confirmed_activity_count' => $confirmedInPeriod,
                'bookings_confirmed_audit_count' => $auditConfirmedCount,
                'bookings_cancelled_count' => $cancelledInPeriod,
                'bookings_converted_to_order_count' => $convertedInPeriod,
                'bookings_completed_count' => $completedBookingInPeriod,
                'pending_bookings_pipeline_count' => $pendingBookingsCount,
                'average_hours_to_confirm' => $avgHoursToConfirm,
            ],
            [
                'bookings_by_day' => $bookingsByDay,
                'booking_status_breakdown' => $statusBreakdown,
            ],
            [
                'columns' => [
                    ['key' => 'booking_status', 'label' => 'Status'],
                    ['key' => 'scheduled_date', 'label' => 'Scheduled'],
                    ['key' => 'company_name', 'label' => 'Company'],
                    ['key' => 'route_name', 'label' => 'Assigned route'],
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
                'bookings_created_count' => 'Bookings with created_at in range.',
                'bookings_confirmed_activity_count' => 'Bookings whose status is confirmed and updated_at fell in range (approximate throughput).',
                'bookings_confirmed_audit_count' => 'Count of booking.confirmed audit events in range (stronger signal for confirmations).',
                'bookings_cancelled_count' => 'Bookings with status cancelled and updated_at in range.',
                'bookings_converted_to_order_count' => 'Bookings with status converted_to_order and updated_at in range.',
                'bookings_completed_count' => 'Bookings with status completed and updated_at in range.',
                'pending_bookings_pipeline_count' => 'Snapshot: non-terminal bookings matching company/city (and status filter); created_at range does not apply.',
                'average_hours_to_confirm' => 'Mean hours from booking created_at to booking.confirmed audit created_at, for audits in range; null if none.',
            ],
        );

        return array_merge($envelope, [
            'recent_activity' => [
                'columns' => [
                    ['key' => 'booking_status', 'label' => 'Status'],
                    ['key' => 'scheduled_date', 'label' => 'Scheduled'],
                    ['key' => 'created_at', 'label' => 'Created'],
                    ['key' => 'company_name', 'label' => 'Company'],
                ],
                'rows' => $recent,
            ],
        ]);
    }

    /**
     * @param  \Illuminate\Database\Query\Builder  $auditConfirmedQuery  Already filtered audit join query (clone before count).
     */
    private function averageHoursBookingCreatedToConfirmAudit(\Illuminate\Database\Query\Builder $auditConfirmedQuery): ?float
    {
        $rows = (clone $auditConfirmedQuery)
            ->select(['bookings.created_at as booking_created', 'audit_logs.created_at as confirmed_at'])
            ->limit(10_000)
            ->get();

        if ($rows->isEmpty()) {
            return null;
        }

        $totalHours = 0.0;
        $valid = 0;
        foreach ($rows as $r) {
            $b = Carbon::parse((string) $r->booking_created);
            $a = Carbon::parse((string) $r->confirmed_at);
            if ($a->lessThanOrEqualTo($b)) {
                continue;
            }
            $totalHours += $b->diffInMinutes($a) / 60.0;
            $valid++;
        }

        return $valid > 0 ? round($totalHours / $valid, 2) : null;
    }
}
