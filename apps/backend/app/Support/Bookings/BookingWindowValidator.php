<?php

namespace App\Support\Bookings;

use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;

/**
 * Ensures paired booking time windows start before end (same calendar day assumption).
 */
final class BookingWindowValidator
{
    public static function validatePairs(Validator $validator, array $pairs): void
    {
        foreach ($pairs as [$startKey, $endKey, $label]) {
            /** @var mixed $rawStart */
            $rawStart = $validator->getData()[$startKey] ?? null;
            /** @var mixed $rawEnd */
            $rawEnd = $validator->getData()[$endKey] ?? null;

            if ($rawStart === null || $rawStart === '' || $rawEnd === null || $rawEnd === '') {
                continue;
            }

            /** @phpstan-ignore-next-line */
            $start = CarbonImmutable::createFromFormat('H:i', (string) $rawStart)->setDate(1970, 1, 1);
            /** @phpstan-ignore-next-line */
            $end = CarbonImmutable::createFromFormat('H:i', (string) $rawEnd)->setDate(1970, 1, 1);

            if ($end->lessThanOrEqualTo($start)) {
                /** @phpstan-ignore-next-line */
                $validator->errors()->add($endKey, "The {$label} end time must be after the start time.");
            }
        }
    }
}
