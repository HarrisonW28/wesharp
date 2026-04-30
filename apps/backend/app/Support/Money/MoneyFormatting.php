<?php

namespace App\Support\Money;

final class MoneyFormatting
{
    public static function formatGbpFromPence(int $pence): string
    {
        $fmt = new \NumberFormatter('en_GB', \NumberFormatter::CURRENCY);
        $fmt->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, 2);
        $fmt->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 2);

        $out = $fmt->formatCurrency($pence / 100, 'GBP');

        return is_string($out) ? $out : sprintf('£%.2f', $pence / 100);
    }
}
