<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Mail\GenericNotificationMailable;
use App\Models\NotificationDelivery;
use Illuminate\Support\Facades\Mail;

final class EmailDelivery
{
    /**
     * @param  array<string, mixed>  $viewData
     */
    public function sendNow(NotificationDelivery $delivery, string $subject, string $view, array $viewData): void
    {
        $to = trim((string) ($delivery->recipient_email ?? ''));
        if ($to === '') {
            $delivery->forceFill([
                'status' => 'failed',
                'failed_at' => now(),
                'failure_reason' => 'Missing recipient_email.',
            ])->save();

            return;
        }

        try {
            Mail::to($to, $delivery->recipient_name ?: null)
                ->send(new GenericNotificationMailable($subject, $view, $viewData));

            $delivery->forceFill([
                'status' => 'sent',
                'sent_at' => now(),
                'failed_at' => null,
                'failure_reason' => null,
            ])->save();
        } catch (\Throwable $e) {
            $delivery->forceFill([
                'status' => 'failed',
                'failed_at' => now(),
                'failure_reason' => mb_substr($e->getMessage(), 0, 1000),
            ])->save();

            throw $e;
        }
    }
}
