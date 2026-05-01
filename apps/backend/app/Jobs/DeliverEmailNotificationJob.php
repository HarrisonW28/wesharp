<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\NotificationDelivery;
use App\Services\Notifications\EmailDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

final class DeliverEmailNotificationJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    /** @param  array<string, mixed>  $viewData */
    public function __construct(
        public string $deliveryId,
        public string $subject,
        public string $view,
        public array $viewData,
    ) {}

    public function handle(EmailDelivery $delivery): void
    {
        $row = NotificationDelivery::query()->find($this->deliveryId);
        if (! $row instanceof NotificationDelivery) {
            return;
        }

        // Idempotent retry: don't re-send if already terminal.
        if (in_array($row->status, ['sent', 'skipped'], true)) {
            return;
        }

        $delivery->sendNow($row, $this->subject, $this->view, $this->viewData);
    }

    public function failed(\Throwable $e): void
    {
        $row = NotificationDelivery::query()->find($this->deliveryId);
        if (! $row instanceof NotificationDelivery) {
            return;
        }

        $row->forceFill([
            'status' => 'failed',
            'failed_at' => now(),
            'failure_reason' => mb_substr($e->getMessage(), 0, 1000),
        ])->save();
    }
}
