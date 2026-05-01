<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Models\Knife;
use App\Support\Reports\ReportEnvelope;

final class KnifeReportService
{
    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $base = Knife::query()
            ->whereBetween('knives.updated_at', [$f->from, $f->to])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('knives.company_id', $f->companyId));

        $total = (int) (clone $base)->count();

        $byStatus = (clone $base)
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

        $throughput = (int) (clone $base)->sharpenedThroughput()->count();

        $paginator = (clone $base)
            ->with(['company:id,name', 'order:id'])
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
            ];
        })->values()->all();

        return ReportEnvelope::make(
            'knives',
            $f->toArray(),
            [
                'knife_movements_count' => $total,
                'sharpened_throughput_count' => $throughput,
            ],
            $byStatus,
            [
                'columns' => [
                    ['key' => 'knife_status', 'label' => 'Status'],
                    ['key' => 'knife_type', 'label' => 'Type'],
                    ['key' => 'label', 'label' => 'Label'],
                    ['key' => 'company_name', 'label' => 'Company'],
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
                'knife_movements_count' => 'Knives with updated_at in range (any workshop status).',
                'sharpened_throughput_count' => 'Subset in sharpened / quality_checked / returned states (same range).',
            ],
        );
    }
}
