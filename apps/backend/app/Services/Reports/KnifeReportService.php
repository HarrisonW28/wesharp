<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Enums\KnifeServiceKind;
use App\Enums\KnifeStatus;
use App\Models\DamageReport;
use App\Models\Knife;
use App\Models\KnifeServiceAssignment;
use App\Support\Analytics\AnalyticsSql;
use App\Support\Reports\ReportEnvelope;
use Illuminate\Database\Eloquent\Builder;

final class KnifeReportService
{
    /** Workshop pipeline (snapshot — date range not applied). */
    private const IN_PROGRESS_STATUSES = [
        KnifeStatus::Received,
        KnifeStatus::Inspected,
        KnifeStatus::Sharpening,
        KnifeStatus::IssueReported,
    ];

    /** Output states for “completed servicing” in cohort. */
    private const COMPLETED_WORKSHOP_STATUSES = [
        KnifeStatus::Sharpened,
        KnifeStatus::QualityChecked,
        KnifeStatus::Returned,
    ];

    private const TOP_COMPANIES_LIMIT = 50;

    /**
     * @param  Builder<Knife>  $q
     */
    private function applyKnifeContextFilters(Builder $q, AdminReportFilters $f, bool $applyUpdatedBetween): void
    {
        if ($applyUpdatedBetween) {
            $q->whereBetween('knives.updated_at', [$f->from, $f->to]);
        }

        $q->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q2) => $q2->where('knives.company_id', $f->companyId))
            ->when($f->knifeStatus !== null, fn ($q2) => $q2->where('knives.knife_status', $f->knifeStatus))
            ->when($f->knifeType !== null, fn ($q2) => $q2->where('knives.knife_type', $f->knifeType))
            ->when($f->serviceType !== null, fn ($q2) => $q2->whereHas('booking', fn ($bq) => $bq->where('service_type', $f->serviceType)));
    }

    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $base = Knife::query()->tap(fn (Builder $q) => $this->applyKnifeContextFilters($q, $f, true));

        $knivesActivityCount = (int) (clone $base)->count();

        $knivesCompletedCount = (int) (clone $base)
            ->whereIn('knives.knife_status', array_map(static fn (KnifeStatus $s): string => $s->value, self::COMPLETED_WORKSHOP_STATUSES))
            ->count();

        $knivesInspectedCount = (int) (clone $base)->where('knives.knife_status', KnifeStatus::Inspected)->count();

        $sharpenedThroughputCount = (int) (clone $base)->sharpenedThroughput()->count();

        $inProgressSnapshot = (int) Knife::query()
            ->tap(fn (Builder $q) => $this->applyKnifeContextFilters($q, $f, false))
            ->whereIn('knives.knife_status', array_map(static fn (KnifeStatus $s): string => $s->value, self::IN_PROGRESS_STATUSES))
            ->count();

        $orderStats = (clone $base)
            ->whereNotNull('knives.order_id')
            ->selectRaw('COUNT(*) AS knife_rows')
            ->selectRaw('COUNT(DISTINCT knives.order_id) AS order_count')
            ->first();

        $knifeRowsOnOrders = $orderStats !== null ? (int) ($orderStats->knife_rows ?? 0) : 0;
        $distinctOrders = $orderStats !== null ? (int) ($orderStats->order_count ?? 0) : 0;
        $averageKnivesPerOrder = $distinctOrders > 0
            ? round($knifeRowsOnOrders / $distinctOrders, 2)
            : null;

        $reserviceAssignmentsCount = (int) KnifeServiceAssignment::query()
            ->where('knife_service_assignments.service_kind', KnifeServiceKind::Reservice->value)
            ->whereBetween('knife_service_assignments.linked_at', [$f->from, $f->to])
            ->whereHas('knife', fn (Builder $kq) => $this->applyKnifeContextFilters($kq, $f, false))
            ->count();

        $serviceKindBreakdown = KnifeServiceAssignment::query()
            ->whereBetween('knife_service_assignments.linked_at', [$f->from, $f->to])
            ->whereHas('knife', fn (Builder $kq) => $this->applyKnifeContextFilters($kq, $f, false))
            ->selectRaw('service_kind AS kind_value, COUNT(*) AS c')
            ->groupBy('service_kind')
            ->orderBy('service_kind')
            ->get()
            ->map(static fn ($r): array => [
                'service_kind' => (string) $r->kind_value,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $damageReportsCreatedCount = (int) DamageReport::query()
            ->notArchived()
            ->whereBetween('damage_reports.created_at', [$f->from, $f->to])
            ->whereHas('knife', fn (Builder $kq) => $this->applyKnifeContextFilters($kq, $f, false))
            ->count();

        $damageBySeverity = DamageReport::query()
            ->notArchived()
            ->whereBetween('damage_reports.created_at', [$f->from, $f->to])
            ->whereHas('knife', fn (Builder $kq) => $this->applyKnifeContextFilters($kq, $f, false))
            ->selectRaw('severity AS severity_value, COUNT(*) AS c')
            ->groupBy('severity')
            ->orderBy('severity')
            ->get()
            ->map(static fn ($r): array => [
                'severity' => (string) $r->severity_value,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $damageByStatus = DamageReport::query()
            ->notArchived()
            ->whereBetween('damage_reports.created_at', [$f->from, $f->to])
            ->whereHas('knife', fn (Builder $kq) => $this->applyKnifeContextFilters($kq, $f, false))
            ->selectRaw('status AS status_value, COUNT(*) AS c')
            ->groupBy('status')
            ->orderBy('status')
            ->get()
            ->map(static fn ($r): array => [
                'status' => (string) $r->status_value,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $dayExpr = AnalyticsSql::dateDay('knives.updated_at');
        $knivesByDay = (clone $base)
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

        $knifeTypeBreakdown = (clone $base)
            ->selectRaw('COALESCE(knives.knife_type, "") AS type_value, COUNT(*) AS c')
            ->groupBy('type_value')
            ->orderBy('type_value')
            ->get()
            ->map(static fn ($r): array => [
                'knife_type' => (string) $r->type_value === '' ? 'unknown' : (string) $r->type_value,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $serviceTypeBreakdown = (clone $base)
            ->leftJoin('bookings', 'bookings.id', '=', 'knives.booking_id')
            ->selectRaw("COALESCE(bookings.service_type, 'none') AS service_value, COUNT(*) AS c")
            ->groupBy('service_value')
            ->orderBy('service_value')
            ->get()
            ->map(static fn ($r): array => [
                'service_type' => (string) $r->service_value,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $knifeStatusBreakdown = (clone $base)
            ->selectRaw('knife_status AS status_value, COUNT(*) AS c')
            ->groupBy('knife_status')
            ->orderBy('knife_status')
            ->get()
            ->map(static fn ($r): array => [
                'status' => (string) $r->status_value,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $topCompanies = (clone $base)
            ->join('companies', 'companies.id', '=', 'knives.company_id')
            ->selectRaw('knives.company_id AS company_id')
            ->selectRaw('companies.name AS company_name')
            ->selectRaw('COUNT(*) AS knife_count')
            ->groupBy('knives.company_id', 'companies.name')
            ->orderByDesc('knife_count')
            ->limit(self::TOP_COMPANIES_LIMIT)
            ->get()
            ->map(static fn ($r): array => [
                'company_id' => (string) $r->company_id,
                'company_name' => (string) $r->company_name,
                'knife_count' => (int) $r->knife_count,
            ])
            ->values()
            ->all();

        $paginator = (clone $base)
            ->with(['company:id,name', 'order:id', 'booking:id,service_type'])
            ->orderByDesc('knives.updated_at')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $f->page);

        $rows = collect($paginator->items())->map(static function ($k): array {
            /** @var Knife $k */
            return [
                'id' => (string) $k->id,
                'knife_status' => $k->knife_status->value,
                'knife_type' => $k->knife_type,
                'label' => $k->label,
                'company_name' => $k->company?->name,
                'order_id' => $k->order_id !== null ? (string) $k->order_id : null,
                'service_type' => $k->booking?->service_type?->value,
            ];
        })->values()->all();

        return ReportEnvelope::make(
            'knives',
            $f->toArray(),
            [
                'knives_activity_count' => $knivesActivityCount,
                'knives_completed_workshop_count' => $knivesCompletedCount,
                'knives_in_progress_snapshot_count' => $inProgressSnapshot,
                'knives_inspected_count' => $knivesInspectedCount,
                'sharpened_throughput_count' => $sharpenedThroughputCount,
                'average_knives_per_order' => $averageKnivesPerOrder,
                'reservice_assignments_count' => $reserviceAssignmentsCount,
                'damage_reports_created_count' => $damageReportsCreatedCount,
            ],
            [
                'knives_by_day' => $knivesByDay,
                'knife_type_breakdown' => $knifeTypeBreakdown,
                'service_type_breakdown' => $serviceTypeBreakdown,
                'knife_status_breakdown' => $knifeStatusBreakdown,
                'service_kind_breakdown' => $serviceKindBreakdown,
                'top_companies_by_knife_volume' => $topCompanies,
                'damage_by_severity' => $damageBySeverity,
                'damage_by_status' => $damageByStatus,
            ],
            [
                'columns' => [
                    ['key' => 'knife_status', 'label' => 'Status'],
                    ['key' => 'knife_type', 'label' => 'Type'],
                    ['key' => 'label', 'label' => 'Label'],
                    ['key' => 'company_name', 'label' => 'Company'],
                    ['key' => 'service_type', 'label' => 'Service'],
                    ['key' => 'order_id', 'label' => 'Order'],
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
                'knives_activity_count' => 'Knife rows with updated_at in range and filters (workshop activity window).',
                'knives_completed_workshop_count' => 'In cohort, status is sharpened, quality_checked, or returned.',
                'knives_in_progress_snapshot_count' => 'Snapshot: received/inspected/sharpening/issue_reported with filters; updated_at range not applied.',
                'knives_inspected_count' => 'In cohort with status inspected.',
                'sharpened_throughput_count' => 'In cohort in sharpened / quality_checked / returned (same as historical throughput scope).',
                'average_knives_per_order' => 'Cohort knives with order_id ÷ distinct orders; null if none.',
                'reservice_assignments_count' => 'knife_service_assignments with service_kind reservice and linked_at in range; knife matches filters (no activity date).',
                'damage_reports_created_count' => 'Non-archived damage_reports created in range for knives matching filters.',
            ],
        );
    }
}
