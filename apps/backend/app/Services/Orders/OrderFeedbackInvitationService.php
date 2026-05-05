<?php

declare(strict_types=1);

namespace App\Services\Orders;

use App\Models\Order;
use App\Models\OrderFeedback;
use App\Services\Notifications\InAppNotificationDispatcher;
use App\Services\Notifications\OrderEmailService;
use Illuminate\Support\Facades\DB;

/**
 * Creates at most one feedback invitation per order (unique order_id) and sends customer-facing invite once.
 */
final class OrderFeedbackInvitationService
{
    public function __construct(
        private readonly OrderEmailService $orderEmails,
        private readonly InAppNotificationDispatcher $inAppNotifications,
    ) {}

    public function inviteAfterOrderCompleted(Order $order): void
    {
        $order->loadMissing(['company', 'booking.contact']);

        /** @var int $claimed */
        $claimed = (int) DB::transaction(function () use ($order): int {
            OrderFeedback::query()->firstOrCreate(
                [
                    'order_id' => $order->id,
                ],
                [
                    'company_id' => (string) $order->company_id,
                ],
            );

            return OrderFeedback::query()
                ->where('order_id', $order->id)
                ->whereNull('invitation_sent_at')
                ->lockForUpdate()
                ->update(['invitation_sent_at' => now()]);
        });

        if ($claimed !== 1) {
            return;
        }

        try {
            $this->orderEmails->sendFeedbackInvite($order);
            $this->inAppNotifications->notifyCustomersOrderFeedbackInvite($order);
        } catch (\Throwable $e) {
            OrderFeedback::query()->where('order_id', $order->id)->update(['invitation_sent_at' => null]);

            throw $e;
        }
    }
}
