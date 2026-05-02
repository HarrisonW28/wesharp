<?php

declare(strict_types=1);

namespace App\Services\Orders;

use App\Models\Order;
use App\Models\OrderFeedback;
use App\Services\Notifications\InAppNotificationDispatcher;
use App\Services\Notifications\OrderEmailService;

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

        /** @var OrderFeedback $feedback */
        $feedback = OrderFeedback::query()->firstOrCreate(
            [
                'order_id' => $order->id,
            ],
            [
                'company_id' => (string) $order->company_id,
            ],
        );

        if ($feedback->invitation_sent_at !== null) {
            return;
        }

        $this->orderEmails->sendFeedbackInvite($order);
        $this->inAppNotifications->notifyCustomersOrderFeedbackInvite($order);

        $feedback->forceFill(['invitation_sent_at' => now()])->save();
    }
}
