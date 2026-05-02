<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateNotificationAdminSettingsRequest;
use App\Models\NotificationAdminSetting;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class NotificationAdminSettingController extends Controller
{
    public function show(): JsonResponse
    {
        $row = NotificationAdminSetting::current();

        return ApiResponses::success([
            'respect_booking_notification_opt_out' => $row->respect_booking_notification_opt_out,
            'respect_order_notification_opt_out' => $row->respect_order_notification_opt_out,
            'respect_subscription_digest_opt_out' => $row->respect_subscription_digest_opt_out,
        ]);
    }

    public function update(UpdateNotificationAdminSettingsRequest $request): JsonResponse
    {
        $row = NotificationAdminSetting::current();
        /** @var array<string, mixed> $validated */
        $validated = $request->validated();
        $row->fill($validated);
        $row->save();

        return $this->show();
    }
}
