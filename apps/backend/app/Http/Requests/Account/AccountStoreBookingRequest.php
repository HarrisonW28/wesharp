<?php

namespace App\Http\Requests\Account;

use App\Enums\ServiceType;
use App\Support\Bookings\BookingWindowValidator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class AccountStoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->company_id !== null;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('location_id') && $this->has('company_location_id')) {
            $this->merge(['location_id' => $this->input('company_location_id')]);
        }

        if (! $this->has('requested_date') && $this->has('requested_collection_date')) {
            $this->merge(['requested_date' => $this->input('requested_collection_date')]);
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @phpstan-ignore-next-line */
        $companyId = (string) $this->user()->company_id;

        return [
            'location_id' => [
                'required',
                'uuid',
                Rule::exists('company_locations', 'id')->where('company_id', $companyId),
            ],
            'requested_date' => ['required', 'date', 'after:yesterday'],
            'time_window_start' => ['required', 'date_format:H:i'],
            'time_window_end' => ['required', 'date_format:H:i'],
            'service_type' => ['required', Rule::enum(ServiceType::class)],
            'estimated_knife_count' => ['nullable', 'integer', 'min:1', 'max:65000'],
            'customer_notes' => ['nullable', 'string', 'max:19500'],
            'damage_acknowledged' => ['accepted'],
            'terms_accepted' => ['accepted'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            BookingWindowValidator::validatePairs($v, [
                ['time_window_start', 'time_window_end', 'collection'],
            ]);
        });
    }

    protected function passedValidation(): void
    {
        $base = trim((string) $this->input('customer_notes', ''));
        $stamp = now('UTC')->toIso8601String();
        $footer = "\n[WeSharp portal — damage & terms acknowledged at {$stamp}]";
        $merged = $base === '' ? ltrim($footer) : $base.$footer;
        $this->merge(['customer_notes' => $merged]);
    }

    /**
     * @return array{
     *   location_id: string,
     *   requested_date: string,
     *   time_window_start: string,
     *   time_window_end: string,
     *   service_type: ServiceType,
     *   estimated_knife_count: ?int,
     *   customer_notes: ?string,
     * }
     */
    public function bookingPayload(): array
    {
        $v = $this->validated();

        /** @var ServiceType $serviceType */
        $serviceType = $v['service_type'];

        return [
            'location_id' => (string) $v['location_id'],
            'requested_date' => $v['requested_date'],
            'time_window_start' => $v['time_window_start'] ?? null,
            'time_window_end' => $v['time_window_end'] ?? null,
            'service_type' => $serviceType,
            'estimated_knife_count' => isset($v['estimated_knife_count']) ? (int) $v['estimated_knife_count'] : null,
            'customer_notes' => $v['customer_notes'] ?? null,
        ];
    }
}
