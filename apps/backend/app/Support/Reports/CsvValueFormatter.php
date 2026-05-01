<?php

declare(strict_types=1);

namespace App\Support\Reports;

use Carbon\CarbonInterface;

/**
 * Human-readable values for streamed CSV exports (Excel-friendly, UTF-8 BOM applied at stream start).
 */
final class CsvValueFormatter
{
    public static function gbpFromPence(int $pence): string
    {
        return number_format($pence / 100, 2, '.', '');
    }

    public static function optionalGbpFromPence(?int $pence): string
    {
        if ($pence === null) {
            return '';
        }

        return self::gbpFromPence($pence);
    }

    public static function utcDateTime(?CarbonInterface $dt): string
    {
        if ($dt === null) {
            return '';
        }

        return $dt->copy()->utc()->format('Y-m-d H:i:s');
    }

    public static function dateOnly(?CarbonInterface $dt): string
    {
        if ($dt === null) {
            return '';
        }

        return $dt->toDateString();
    }
}
