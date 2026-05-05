<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Enums\EvidencePhotoVisibility;
use App\Enums\InAppNotificationAudience;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Booking;
use App\Models\CompanySubscription;
use App\Models\CustomerPortalUpdate;
use App\Models\DamageReport;
use App\Models\EvidencePhoto;
use App\Models\InAppNotification;
use App\Models\Invoice;
use App\Models\NotificationDelivery;
use App\Models\Order;
use App\Models\RouteStop;
use App\Models\StripeCheckoutAttempt;
use App\Models\User;
use App\Support\Orders\OrderJson;
use App\Support\Permissions;
use Illuminate\Support\Str;

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

    public function notifyCustomersBookingPipeline(Booking $booking, string $kind, string $title, string $body, ?string $dedupeSuffix = null): void
    {
        if ($booking->company_id === null) {
            return;
        }

        $path = '/account/bookings/'.$booking->id;
        $dedupeBase = $dedupeSuffix !== null && $dedupeSuffix !== ''
            ? $kind.':'.$booking->id.':'.$dedupeSuffix
            : $kind.':'.$booking->id;

        foreach ($this->activeCustomersForCompany((string) $booking->company_id) as $user) {
            $this->insertCustomer($user, $kind, $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    public function notifyCustomersOrderPipeline(Order $order, string $kind, string $title, string $body, ?string $dedupeSuffix = null): void
    {
        if ($order->company_id === null) {
            return;
        }

        $path = '/account/orders/'.$order->id;
        $dedupeBase = $dedupeSuffix !== null && $dedupeSuffix !== ''
            ? $kind.':'.$order->id.':'.$dedupeSuffix
            : $kind.':'.$order->id;

        foreach ($this->activeCustomersForCompany((string) $order->company_id) as $user) {
            $this->insertCustomer($user, $kind, $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    /** Customer-visible fulfilment update or team note (portal timeline). */
    public function notifyCustomersCustomerPortalUpdate(CustomerPortalUpdate $update): void
    {
        if ($update->visibility !== EvidencePhotoVisibility::CustomerVisible) {
            return;
        }

        $update->loadMissing(['order:id,company_id', 'booking:id,company_id']);
        $title = 'Update on your order';
        $body = 'There is a new note from the team in your portal.';
        $kind = 'customer.fulfilment.portal_update';

        if ($update->order_id !== null && $update->order instanceof Order && $update->order->company_id !== null) {
            $this->notifyCustomersOrderPipeline($update->order, $kind, $title, $body, 'portal_update:'.$update->id);

            return;
        }

        if ($update->booking_id !== null && $update->booking instanceof Booking && $update->booking->company_id !== null) {
            $this->notifyCustomersBookingPipeline($update->booking, $kind, $title, $body, 'portal_update:'.$update->id);
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

    /** Staff task when a payer abandoned Stripe Checkout after opting in to follow-up (not tied to terms acceptance). */
    public function notifyStaffInvoiceCheckoutAbandoned(StripeCheckoutAttempt $attempt, Invoice $invoice): void
    {
        $invoice->loadMissing('company:id,name');
        $ref = $invoice->invoice_number !== null && $invoice->invoice_number !== ''
            ? $invoice->invoice_number
            : (string) $invoice->id;
        $companyName = $invoice->company?->name ?? 'Customer';
        $title = 'Invoice checkout abandoned';
        $body = 'Stripe Checkout was left incomplete for invoice '.$ref.' ('.$companyName.'). The payer opted in to a payment reminder — consider a quick follow-up.';
        $path = '/admin/invoices/'.$invoice->id;
        $dedupeBase = 'staff.invoice.checkout_abandoned:'.(string) $attempt->id;

        foreach ($this->internalStaffWithPaymentsManage() as $user) {
            $this->insertStaff(
                $user,
                'staff.invoice.checkout_abandoned',
                $title,
                $body,
                $path,
                $dedupeBase.':'.$user->id,
            );
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

    public function notifyCustomersSubscription(
        CompanySubscription $subscription,
        string $kind,
        string $title,
        string $body,
        ?string $dedupeSuffix = null,
    ): void {
        if ($subscription->company_id === null) {
            return;
        }

        $path = '/account/subscription';
        $dedupeBase = $dedupeSuffix !== null && $dedupeSuffix !== ''
            ? $kind.':'.$subscription->id.':'.$dedupeSuffix
            : $kind.':'.$subscription->id;

        foreach ($this->activeCustomersForCompany((string) $subscription->company_id) as $user) {
            $this->insertCustomer($user, $kind, $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    /** Customer-visible evidence photo (no internal captions/notes). */
    public function notifyCustomersCustomerVisibleEvidencePhoto(EvidencePhoto $photo): void
    {
        if ($photo->visibility !== EvidencePhotoVisibility::CustomerVisible) {
            return;
        }

        $photo->loadMissing([
            'order:id,company_id',
            'routeStop' => fn ($q) => $q->select(['id', 'booking_id']),
            'damageReport',
        ]);

        $title = 'Photos added';
        $body = 'New service photos are available in your portal.';
        $kind = 'customer.fulfilment.photos_visible';

        $order = $photo->order;
        if (! $order instanceof Order && $photo->damageReport !== null) {
            $photo->damageReport->loadMissing(['order.company', 'knife.order']);
            $order = $photo->damageReport->order ?? $photo->damageReport->knife?->order;
        }
        if ($order instanceof Order && $order->company_id !== null) {
            $this->notifyCustomersOrderPipeline($order, $kind, $title, $body, 'photo:'.$photo->id);

            return;
        }

        $routeStop = $photo->routeStop;
        if ($routeStop === null) {
            return;
        }

        $routeStop->loadMissing('booking:id,company_id');
        $booking = $routeStop->booking;
        if (! $booking instanceof Booking || $booking->company_id === null) {
            return;
        }

        $orderId = Order::query()->where('booking_id', $booking->id)->orderBy('created_at')->value('id');
        if (is_string($orderId) && $orderId !== '') {
            $resolved = Order::query()->find($orderId);
            if ($resolved instanceof Order) {
                $this->notifyCustomersOrderPipeline($resolved, $kind, $title, $body, 'photo:'.$photo->id);

                return;
            }
        }

        $this->notifyCustomersBookingPipeline($booking, $kind, $title, $body, 'photo:'.$photo->id);
    }

    /** Users who can open the webhook inbox / integration diagnostics. */
    public function notifyStaffWebhookProcessingFailed(string $provider, string $eventType, string $externalId): void
    {
        $providerLabel = Str::lower(trim($provider));
        if ($providerLabel === '') {
            $providerLabel = 'webhook';
        }

        $typeLabel = trim($eventType) !== '' ? trim($eventType) : 'unknown';
        $shortId = Str::limit($externalId, 32, '');

        $title = ucfirst($providerLabel).' webhook needs attention';
        $body = 'An incoming `'.$typeLabel.'` event could not be processed. Check the webhook inbox.';
        $path = '/admin/webhooks/inbox';
        $dedupeBase = 'staff.webhook.failed:'.$providerLabel.':'.hash('sha256', $externalId);

        foreach ($this->internalStaffWithSystemTools() as $user) {
            $this->insertStaff($user, 'staff.webhook.failed', $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    public function notifyStaffInvoiceBecameOverdue(Invoice $invoice): void
    {
        $invoice->loadMissing('company:id,name');
        $ref = $invoice->invoice_number !== null && $invoice->invoice_number !== ''
            ? (string) $invoice->invoice_number
            : (string) $invoice->id;
        $companyName = $invoice->company?->name ?? 'Customer';

        $title = 'Invoice overdue';
        $body = 'Invoice '.$ref.' ('.$companyName.') is now overdue — follow up as needed.';
        $path = '/admin/invoices/'.$invoice->id;
        $dedupeBase = 'staff.invoice.overdue:'.$invoice->id;

        foreach ($this->internalStaffWithInvoicesView() as $user) {
            $this->insertStaff($user, 'staff.invoice.overdue', $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    public function notifyStaffRouteStopSkipped(RouteStop $stop): void
    {
        $stop->loadMissing(['route:id', 'booking:id,company_id', 'booking.company:id,name']);
        $routeId = $stop->route_id;
        if ($routeId === null) {
            return;
        }

        $companyName = $stop->booking?->company?->name ?? 'Customer';
        $reason = Str::limit(trim((string) $stop->failure_reason), 160, '…');
        if ($reason === '') {
            $reason = 'No reason given.';
        }

        $title = 'Route stop skipped';
        $body = $companyName.': '.$reason;
        $path = '/admin/routes/'.$routeId.'/stops/'.$stop->id;
        $dedupeBase = 'staff.route.stop_skipped:'.$stop->id;

        foreach ($this->internalStaffWithRoutesView() as $user) {
            $this->insertStaff($user, 'staff.route.stop_skipped', $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    public function notifyStaffSubscriptionOverageOnOrder(Order $order, CompanySubscription $subscription): void
    {
        $order->loadMissing('company:id,name');
        $subscription->loadMissing('company:id,name');

        $ref = OrderJson::reference($order);
        $companyName = $order->company?->name ?? $subscription->company?->name ?? 'Customer';

        $title = 'Subscription overage';
        $body = 'Order '.$ref.' ('.$companyName.') used units beyond the included allowance — confirm billing.';
        $path = '/admin/orders/'.$order->id;
        $dedupeBase = 'staff.subscription.overage:'.$order->id;

        foreach ($this->internalStaffWithSubscriptionsView() as $user) {
            $this->insertStaff($user, 'staff.subscription.overage', $title, $body, $path, $dedupeBase.':'.$user->id);
        }
    }

    public function notifyStaffDamageReportLogged(DamageReport $report): void
    {
        $report->loadMissing(['order.company', 'knife.order.company', 'company']);
        $order = $report->order ?? $report->knife?->order;
        if ($order === null) {
            return;
        }

        $order->loadMissing('company:id,name');
        $ref = OrderJson::reference($order);
        $companyName = $order->company?->name ?? $report->company?->name ?? 'Customer';
        $severity = $report->severity?->value ?? 'noted';

        $title = 'Damage report logged';
        $body = 'Severity '.$severity.' on order '.$ref.' ('.$companyName.').';
        $path = '/admin/orders/'.$order->id;
        $dedupeBase = 'staff.damage_report:'.$report->id;

        foreach ($this->internalStaffWithOrdersView() as $user) {
            $this->insertStaff($user, 'staff.damage_report.logged', $title, $body, $path, $dedupeBase.':'.$user->id);
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
    private function internalStaffWithPaymentsManage(): iterable
    {
        return User::query()
            ->whereIn('role', UserRole::internalValues())
            ->where('status', UserStatus::Active)
            ->cursor()
            ->filter(static fn (User $u) => Permissions::userMay($u, Permissions::PAYMENTS_MANAGE));
    }

    /** @return iterable<User> */
    private function internalStaffWithSystemTools(): iterable
    {
        return User::query()
            ->whereIn('role', UserRole::internalValues())
            ->where('status', UserStatus::Active)
            ->cursor()
            ->filter(static fn (User $u) => Permissions::userMay($u, Permissions::SYSTEM_TOOLS_VIEW));
    }

    /** @return iterable<User> */
    private function internalStaffWithInvoicesView(): iterable
    {
        return User::query()
            ->whereIn('role', UserRole::internalValues())
            ->where('status', UserStatus::Active)
            ->cursor()
            ->filter(static fn (User $u) => Permissions::userMay($u, Permissions::INVOICES_VIEW));
    }

    /** @return iterable<User> */
    private function internalStaffWithRoutesView(): iterable
    {
        return User::query()
            ->whereIn('role', UserRole::internalValues())
            ->where('status', UserStatus::Active)
            ->cursor()
            ->filter(static fn (User $u) => Permissions::userMay($u, Permissions::ROUTES_VIEW));
    }

    /** @return iterable<User> */
    private function internalStaffWithSubscriptionsView(): iterable
    {
        return User::query()
            ->whereIn('role', UserRole::internalValues())
            ->where('status', UserStatus::Active)
            ->cursor()
            ->filter(static fn (User $u) => Permissions::userMay($u, Permissions::SUBSCRIPTIONS_VIEW));
    }

    /** @return iterable<User> */
    private function internalStaffWithOrdersView(): iterable
    {
        return User::query()
            ->whereIn('role', UserRole::internalValues())
            ->where('status', UserStatus::Active)
            ->cursor()
            ->filter(static fn (User $u) => Permissions::userMay($u, Permissions::ORDERS_VIEW));
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
