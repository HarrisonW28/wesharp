<?php

declare(strict_types=1);

namespace App\Support\Reports;

use Illuminate\Support\Facades\DB;

/** Portable expressions for operational reporting (SQLite tests + MySQL/Postgres prod). */
final class OperationalReportSql
{
    public static function avgSecondsBetween(string $startColumn, string $endColumn): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "AVG((strftime('%s', {$endColumn}) - strftime('%s', {$startColumn})))",
            'pgsql' => "AVG(EXTRACT(EPOCH FROM ({$endColumn} - {$startColumn})))",
            default => "AVG(TIMESTAMPDIFF(SECOND, {$startColumn}, {$endColumn}))",
        };
    }
}
