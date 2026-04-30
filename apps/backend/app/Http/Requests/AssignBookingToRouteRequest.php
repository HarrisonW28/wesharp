<?php

namespace App\Http\Requests;

use App\Support\Bookings\BookingWindowValidator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AssignBookingToRouteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'route_id' => ['required', 'uuid', 'exists:routes,id'],
            'sequence' => ['nullable', 'integer', 'min:1', 'max:50000'],
            'confirmed_collection_date' => ['nullable', 'date'],
            'confirmed_time_window_start' => ['nullable', 'date_format:H:i'],
            'confirmed_time_window_end' => ['nullable', 'date_format:H:i'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            BookingWindowValidator::validatePairs($v, [
                ['confirmed_time_window_start', 'confirmed_time_window_end', 'confirmed collection'],
            ]);
        });
    }

    /**
     * Non-empty confirmed window fields to apply when assigning (optional).
     *
     * @return array<string, string>|null
     */
    public function optionalConfirmWindow(): ?array
    {
        $v = $this->validated();
        $out = [];

        if (! empty($v['confirmed_collection_date'] ?? null)) {
            $out['confirmed_collection_date'] = (string) $v['confirmed_collection_date'];
        }
        if (array_key_exists('confirmed_time_window_start', $v) && $v['confirmed_time_window_start'] !== null && $v['confirmed_time_window_start'] !== '') {
            $out['confirmed_time_window_start'] = (string) $v['confirmed_time_window_start'];
        }
        if (array_key_exists('confirmed_time_window_end', $v) && $v['confirmed_time_window_end'] !== null && $v['confirmed_time_window_end'] !== '') {
            $out['confirmed_time_window_end'] = (string) $v['confirmed_time_window_end'];
        }

        return $out === [] ? null : $out;
    }
}
