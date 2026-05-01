<?php

declare(strict_types=1);

namespace App\Support\Reports;

/**
 * Consistent JSON shape for admin reports (under ApiResponses success `data`).
 *
 * @phpstan-type TableShape array{
 *   columns: list<array{key: string, label: string}>,
 *   rows: list<array<string, mixed>>,
 *   meta?: array<string, mixed>
 * }
 */
final class ReportEnvelope
{
    /**
     * @param  array<string, int|float|string|null>  $kpis  Scalar KPIs only — no fabricated chart points
     * @param  list<array<string, mixed>>|null  $series  Time buckets or breakdowns from real aggregates
     * @param  TableShape|null  $table
     * @param  array<string, string>  $definitions  Human-readable metric definitions
     * @param  array<string, mixed>  $export
     * @return array<string, mixed>
     */
    public static function make(
        string $reportKey,
        array $filters,
        array $kpis,
        ?array $series,
        ?array $table,
        array $definitions = [],
        array $export = [],
    ): array {
        return [
            'report' => $reportKey,
            'filters' => $filters,
            'kpis' => $kpis,
            'series' => $series ?? [],
            'table' => $table,
            'definitions' => $definitions,
            'export' => $export !== [] ? $export : [
                'available' => false,
                'formats' => [],
                'message' => 'CSV/PDF export is not implemented yet.',
            ],
        ];
    }
}
