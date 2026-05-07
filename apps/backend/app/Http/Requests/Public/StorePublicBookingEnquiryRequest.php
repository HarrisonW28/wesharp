<?php

namespace App\Http\Requests\Public;

use App\Enums\ServiceType;
use App\Models\SubscriptionPlan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePublicBookingEnquiryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'business_name' => ['required', 'string', 'max:255'],
            'contact_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:48'],
            'address_line_1' => ['required', 'string', 'max:512'],
            'address_line_2' => ['nullable', 'string', 'max:512'],
            'city' => ['required', 'string', 'max:191'],
            'postcode' => ['required', 'string', 'max:24'],
            'estimated_knife_count' => ['nullable', 'integer', 'min:1', 'max:50000'],
            'preferred_date' => ['required', 'date', 'after:yesterday'],
            'time_window_preference' => ['required', 'string', 'max:500'],
            'service_type' => ['required', Rule::enum(ServiceType::class)],
            'message' => ['required', 'string', 'max:20000'],
            'terms_accepted' => ['accepted'],
            'programme_interest' => ['sometimes', 'nullable', 'string', Rule::in(['one_off', 'subscription', 'unsure'])],
            'subscription_plan_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists(SubscriptionPlan::class, 'id')->where('is_active', true),
            ],
            'price_guide_estimate_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:500000000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'preferred_date.after' => 'Preferred date cannot be in the past.',
            'terms_accepted.accepted' => 'Please acknowledge the enquiry terms.',
        ];
    }
}
