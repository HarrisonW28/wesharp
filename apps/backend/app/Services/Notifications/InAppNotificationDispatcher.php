<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Enums\InAppNotificationAudience;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Booking;
use App\Models\InAppNotification;
use App\Models\Invoice;
use App\Models\NotificationDelivery;
use App\Models\Order;
use App\Models\User;
use App\Support\Permissions;

final class InAppNotificationDispatcher
{
    public function notifyStaffNewBooking(Booking $booking): void
    {
        $booking->loadMissing('company:id,name');
        $companyName = $booking->company?->name ?? 'Account';
        $title = 'New booking request';
        $body = 'A booking was requested for '.$companyName.'.';
        $path = '/admin/bookings/'.$booking->id;
        $dedupeBase = 'staff.booking.created:'.$booking->id;

        foreach ($this->internalStaffWithBookingsView() as $user) {
            $this->insertStaff($user, 'staff.booking.created', $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    public function notifyStaffEmailDeliveryPermanentlyFailed(NotificationDelivery $delivery): void
    {
        $type = (string) $delivery->type;
        $title = 'Email delivery failed';
        $body = 'Outbound email `'.$type.'` failed after retries. Check the delivery log for details.';
        $path = '/admin/notifications?status=failed';
        $dedupeBase = 'staff.email.failed:'.$delivery->id;

        foreach ($this->staffWithDeliveryInbox() as $user) {
            $this->insertStaff($user, 'staff.email.failed', $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    public function notifyCustomersBookingPipeline(Booking $booking, string $kind, string $title, string $body): void
    {
        if ($booking->company_id === null) {
            return;
        }

        $path = '/account/bookings/'.$booking->id;
        $dedupeBase = $kind.':'.$booking->id;

        foreach ($this->activeCustomersForCompany((string) $booking->company_id) as $user) {
            $this->insertCustomer($user, $kind, $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    public function notifyCustomersOrderPipeline(Order $order, string $kind, string $title, string $body): void
    {
        if ($order->company_id === null) {
            return;
        }

        $path = '/account/orders/'.$order->id;
        $dedupeBase = $kind.':'.$order->id;

        foreach ($this->activeCustomersForCompany((string) $order->company_id) as $user) {
            $this->insertCustomer($user, $kind, $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    public function notifyCustomersInvoicePipeline(Invoice $invoice, string $kind, string $title, string $body): void
    {
        if ($invoice->company_id === null) {
            return;
        }

        $path = '/account/invoices/'.$invoice->id;
        $dedupeBase = $kind.':'.$invoice->id;

        foreach ($this->activeCustomersForCompany((string) $invoice->company_id) as $user) {
            $this->insertCustomer($user, $kind, $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    /** Post-completion feedback request (deep-link to order feedback card). */
    public function notifyCustomersOrderFeedbackInvite(Order $order): void
    {
        if ($order->company_id === null) {
            return;
        }

        $kind = 'customer.order.feedback_invite';
        $title = 'How did we do?';
        $body = 'Your sharpening order is complete — a quick rating helps us improve.';
        $path = '/account/orders/'.$order->id.'#feedback';
        $dedupeBase = $kind.':'.$order->id;

        foreach ($this->activeCustomersForCompany((string) $order->company_id) as $user) {
            $this->insertCustomer($user, $kind, $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    /** @return iterable<User> */
    private function internalStaffWithBookingsView(): iterable
    {
        return User::query()
            ->whereIn('role', UserRole::internalValues())
            ->where('status', UserStatus::Active)
            ->cursor()
            ->filter(static fn (User $u) => Permissions::userMay($u, Permissions::BOOKINGS_VIEW));
    }

    /** @return iterable<User> */
    private function staffWithDeliveryInbox(): iterable
    {
        return User::query()
            ->whereIn('role', UserRole::internalValues())
            ->where('status', UserStatus::Active)
            ->cursor()
            ->filter(static fn (User $u) => Permissions::userMay($u, Permissions::NOTIFICATIONS_DELIVERIES_VIEW));
    }

    /** @return iterable<User> */
    private function activeCustomersForCompany(string $companyId): iterable
    {
        return User::query()
            ->where('company_id', $companyId)
            ->whereIn('role', [UserRole::CustomerOwner->value, UserRole::CustomerStaff->value])
            ->where('status', UserStatus::Active)
            ->cursor();
    }

    private function insertStaff(User $user, string $kind, string $title, ?string $body, ?string $path, string $dedupeKey): void
    {
        $this->insert($user, InAppNotificationAudience::Staff, $kind, $title, $body, $path, $dedupeKey);
    }

    private function insertCustomer(User $user, string $kind, string $title, ?string $body, ?string $path, string $dedupeKey): void
    {
        $this->insert($user, InAppNotificationAudience::Customer, $kind, $title, $body, $path, $dedupeKey);
    }

    private function insert(
        User $user,
        InAppNotificationAudience $audience,
        string $kind,
        string $title,
        ?string $body,
        ?string $path,
        string $dedupeKey,
    ): void {
        if (InAppNotification::query()->where('user_id', $user->id)->where('dedupe_key', $dedupeKey)->exists()) {
            return;
        }

        InAppNotification::query()->create([
            'user_id' => $user->id,
            'audience' => $audience,
            'kind' => $kind,
            'title' => $title,
            'body' => $body,
            'path' => $path,
            'dedupe_key' => $dedupeKey,
        ]);
    }
}
