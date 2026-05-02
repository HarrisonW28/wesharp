<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateNotificationAdminSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && Permissions::userMay($user, Permissions::SETTINGS_MANAGE);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'respect_booking_notification_opt_out' => ['sometimes', 'boolean'],
            'respect_order_notification_opt_out' => ['sometimes', 'boolean'],
            'respect_subscription_digest_opt_out' => ['sometimes', 'boolean'],
        ];
    }
}
