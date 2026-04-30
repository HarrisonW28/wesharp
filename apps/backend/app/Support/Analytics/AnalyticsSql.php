<?php

namespace App\Support\Analytics;

use Illuminate\Support\Facades\DB;

/**
 * Portable date/week bucket expressions for SQLite (tests) and MySQL (typical prod).
 */
final class AnalyticsSql
{
    public static function dateDay(string $qualifiedColumn): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m-%d', {$qualifiedColumn})",
            default => "DATE({$qualifiedColumn})",
        };
    }

    /**
     * ISO-ish week label (year + week), e.g. 2026-W18.
     * SQLite uses strftime %G / %V; MySQL uses composite DATE_FORMAT.
     */
    public static function weekBucket(string $qualifiedColumn): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%G', {$qualifiedColumn}) || '-W' || printf('%02d', CAST(strftime('%V', {$qualifiedColumn}) AS INTEGER))",
            default => "CONCAT(DATE_FORMAT({$qualifiedColumn}, '%x'), '-W', DATE_FORMAT({$qualifiedColumn}, '%v'))",
        };
    }
}
