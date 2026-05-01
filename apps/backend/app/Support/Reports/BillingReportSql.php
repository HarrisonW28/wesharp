<?php

declare(strict_types=1);

namespace App\Support\Reports;

use Illuminate\Support\Facades\DB;

/** Portable SQL snippets for billing / receivables reports. */
final class BillingReportSql
{
    /**
     * Average calendar days from invoice issued date to last payment timestamp.
     *
     * @param  string  $issuedDateColumn  Qualified column (date)
     * @param  string  $paidAtColumn  Qualified column (datetime)
     */
    public static function avgDaysIssuedToPaid(string $issuedDateColumn, string $paidAtColumn): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "AVG(CAST((julianday({$paidAtColumn}) - julianday({$issuedDateColumn})) AS REAL))",
            'pgsql' => "AVG(EXTRACT(EPOCH FROM ({$paidAtColumn}::timestamp - {$issuedDateColumn}::timestamp)) / 86400.0)",
            default => "AVG(DATEDIFF(DATE({$paidAtColumn}), {$issuedDateColumn}))",
        };
    }
}
