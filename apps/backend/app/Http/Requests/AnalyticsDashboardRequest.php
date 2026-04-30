<?php

namespace App\Http\Requests;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Foundation\Http\FormRequest;

final class AnalyticsDashboardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
        ];
    }

    public function validatedCity(): ?string
    {
        $city = $this->validated('city');

        /** @phpstan-ignore-next-line */
        return is_string($city) && $city !== '' ? $city : null;
    }

    /**
     * @return array{CarbonInterface, CarbonInterface}
     */
    public function reportingRangeInclusive(): array
    {
        $validated = $this->validated();
        /** @phpstan-ignore-next-line */
        $to = isset($validated['date_to'])
            /** @phpstan-ignore-next-line */
            ? Carbon::parse((string) $validated['date_to'], 'UTC')->endOfDay()
            : Carbon::now('UTC')->endOfDay();
        /** @phpstan-ignore-next-line */
        $from = isset($validated['date_from'])
            /** @phpstan-ignore-next-line */
            ? Carbon::parse((string) $validated['date_from'], 'UTC')->startOfDay()
            /** @phpstan-ignore-next-line */
            : (clone $to)->utc()->startOfDay()->subDays(90);

        /** @phpstan-ignore-next-line */
        if ($from->gt($to)) {
            /** @phpstan-ignore-next-line */
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        return [$from, $to];
    }
}
