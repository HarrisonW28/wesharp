<?php

namespace App\Http\Requests;

use App\Support\Bookings\BookingWindowValidator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class ConfirmBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
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
     * @return array<string, mixed>
     */
    public function overridePayload(): array
    {
        $v = $this->validated();
        $out = [];
        foreach (['confirmed_collection_date', 'confirmed_time_window_start', 'confirmed_time_window_end'] as $key) {
            if (array_key_exists($key, $v) && $v[$key] !== null && $v[$key] !== '') {
                $out[$key] = $v[$key];
            }
        }

        return $out;
    }
}
