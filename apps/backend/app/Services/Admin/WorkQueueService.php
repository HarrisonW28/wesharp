<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Enums\BookingStatus;
use App\Enums\DamageReportStatus;
use App\Enums\InvoiceStatus;
use App\Enums\OperationalRouteStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Booking;
use App\Models\CompanySubscription;
use App\Models\DamageReport;
use App\Models\Invoice;
use App\Models\NotificationDelivery;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Models\WebhookInbox;
use App\Support\Permissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;

final class WorkQueueService
{
    /**
     * @return array{
     *   sections: list<array{key: string, label: string, items: list<array{id: string, title: string, count: int, href: string, action_label: string}>}>,
     * }
     */
    public function build(User $viewer): array
    {
        $sections = [];

        if (Permissions::userMay($viewer, Permissions::BOOKINGS_VIEW)) {
            $sections[] = [
                'key' => 'bookings',
                'label' => 'Bookings',
                'items' => $this->filterNonZero([
                    $this->item(
                        'bookings.unassigned_route',
                        'Bookings without a route',
                        $this->countBookingsUnassignedRoute(),
                        '/admin/bookings?route_assigned=unassigned',
                        'Review bookings',
                    ),
                    $this->item(
                        'bookings.missing_collection_window',
                        'Bookings missing a confirmed collection window',
                        $this->countBookingsMissingCollectionWindow(),
                        '/admin/bookings?collection_window=missing',
                        'Confirm windows',
                    ),
                ]),
            ];
        }

        if (Permissions::userMay($viewer, Permissions::ROUTES_VIEW)) {
            $sections[] = [
                'key' => 'routes',
                'label' => 'Routes',
                'items' => $this->filterNonZero([
                    $this->item(
                        'routes.missing_driver',
                        'Active routes without a driver',
                        $this->countRoutesMissingDriver($viewer),
                        '/admin/routes?driver_user_id=unassigned',
                        'Assign drivers',
                    ),
                ]),
            ];
        }

        if (Permissions::userMay($viewer, Permissions::ORDERS_VIEW)) {
            $sections[] = [
                'key' => 'orders',
                'label' => 'Orders',
                'items' => $this->filterNonZero([
                    $this->item(
                        'orders.missing_knives',
                        'Workshop orders with no knives logged yet',
                        $this->countOrdersMissingKnives(),
                        '/admin/orders?needs_knives=1',
                        'Log knives',
                    ),
                    $this->item(
                        'orders.missing_workshop_photos',
                        'Workshop orders without evidence photos',
                        $this->countOrdersMissingWorkshopPhotos(),
                        '/admin/orders?needs_workshop_photos=1',
                        'Upload photos',
                    ),
                    $this->item(
                        'orders.ready_for_invoice',
                        'Completed orders with no invoice on file',
                        $this->countOrdersReadyForInvoice(),
                        '/admin/orders?status=completed&invoice_status=none',
                        'Draft invoices',
                    ),
                ]),
            ];
        }

        if (Permissions::userMay($viewer, Permissions::INVOICES_VIEW)) {
            $sections[] = [
                'key' => 'invoices',
                'label' => 'Invoices',
                'items' => $this->filterNonZero([
                    $this->item(
                        'invoices.unpaid',
                        'Invoices with an outstanding balance',
                        $this->countInvoicesUnpaid(),
                        '/admin/invoices?settlement=unpaid',
                        'Chase payment',
                    ),
                    $this->item(
                        'invoices.overdue',
                        'Overdue invoices',
                        $this->countInvoicesOverdue(),
                        '/admin/invoices?status=overdue',
                        'Review overdue',
                    ),
                ]),
            ];
        }

        if (Permissions::userMay($viewer, Permissions::NOTIFICATIONS_DELIVERIES_VIEW)) {
            $sections[] = [
                'key' => 'notifications',
                'label' => 'Notifications',
                'items' => $this->filterNonZero([
                    $this->item(
                        'notifications.failed_deliveries',
                        'Failed email / notification deliveries',
                        $this->countFailedNotificationDeliveries(),
                        '/admin/notifications?status=failed',
                        'View failures',
                    ),
                ]),
            ];
        }

        if (Permissions::userMay($viewer, Permissions::SYSTEM_TOOLS_VIEW)) {
            $sections[] = [
                'key' => 'integrations',
                'label' => 'Integrations',
                'items' => $this->filterNonZero([
                    $this->item(
                        'webhooks.failed',
                        'Webhook inbox — failed deliveries',
                        $this->countFailedWebhookDeliveries(),
                        '/admin/webhooks/inbox',
                        'Open inbox',
                    ),
                ]),
            ];
        }

        if (Permissions::userMay($viewer, Permissions::PAYMENTS_VIEW)) {
            $sections[] = [
                'key' => 'payments',
                'label' => 'Payments',
                'items' => $this->filterNonZero([
                    $this->item(
                        'payments.overdue',
                        'Recorded payments marked overdue',
                        $this->countOverduePayments(),
                        '/admin/payments',
                        'Review payments',
                    ),
                ]),
            ];
        }

        if (Permissions::userMay($viewer, Permissions::SUBSCRIPTIONS_VIEW)) {
            $sections[] = [
                'key' => 'subscriptions',
                'label' => 'Subscriptions',
                'items' => $this->filterNonZero([
                    $this->item(
                        'subscriptions.past_due',
                        'Programme subscriptions past due',
                        $this->countPastDueSubscriptions(),
                        '/admin/subscriptions',
                        'Review subscriptions',
                    ),
                    $this->item(
                        'subscriptions.recent_order_overage',
                        'Recent orders with subscription overage recorded',
                        $this->countOrdersWithSubscriptionOverage(),
                        '/admin/subscriptions',
                        'Review usage',
                    ),
                ]),
            ];
        }

        if (Permissions::userMay($viewer, Permissions::KNIVES_VIEW)) {
            $sections[] = [
                'key' => 'quality',
                'label' => 'Quality & issues',
                'items' => $this->filterNonZero([
                    $this->item(
                        'damage.open_reports',
                        'Open damage reports',
                        $this->countOpenDamageReports(),
                        '/admin/reports/knives',
                        'Knife & service report',
                    ),
                ]),
            ];
        }

        if (Permissions::userMay($viewer, Permissions::USERS_VIEW)) {
            $sections[] = [
                'key' => 'people',
                'label' => 'People',
                'items' => $this->filterNonZero([
                    $this->item(
                        'users.pending_invites',
                        'Portal users awaiting activation',
                        $this->countPendingInvitedUsers(),
                        '/admin/users?status=invited',
                        'Manage invites',
                    ),
                ]),
            ];
        }

        $sections = array_values(array_filter($sections, static fn (array $s): bool => $s['items'] !== []));

        return ['sections' => $sections];
    }

    /**
     * @param  list<array{id: string, title: string, count: int, href: string, action_label: string}>  $items
     * @return list<array{id: string, title: string, count: int, href: string, action_label: string}>
     */
    private function filterNonZero(array $items): array
    {
        return array_values(array_filter($items, static fn (array $i): bool => ($i['count'] ?? 0) > 0));
    }

    /**
     * @return array{id: string, title: string, count: int, href: string, action_label: string}
     */
    private function item(string $id, string $title, int $count, string $href, string $actionLabel): array
    {
        return [
            'id' => $id,
            'title' => $title,
            'count' => $count,
            'href' => $href,
            'action_label' => $actionLabel,
        ];
    }

    private function countBookingsUnassignedRoute(): int
    {
        return (int) Booking::query()
            ->whereNull('assigned_route_id')
            ->whereNotIn('booking_status', [
                BookingStatus::Cancelled,
                BookingStatus::Completed,
                BookingStatus::ConvertedToOrder,
                BookingStatus::NoShow,
                BookingStatus::Returned,
            ])
            ->count();
    }

    private function countBookingsMissingCollectionWindow(): int
    {
        return (int) Booking::query()
            ->whereIn('booking_status', [BookingStatus::Confirmed, BookingStatus::AssignedToRoute])
            ->where(function (Builder $sub): void {
                $sub->whereNull('confirmed_collection_date')
                    ->orWhereNull('confirmed_time_window_start')
                    ->orWhereNull('confirmed_time_window_end');
            })
            ->count();
    }

    /** @param  Builder<OperationalRoute>  $base */
    private function restrictOperationalRoutesForViewer(Builder $base, User $viewer): void
    {
        $role = $viewer->resolvedRole();

        if ($role === UserRole::SuperAdmin || $role === UserRole::Admin) {
            return;
        }

        if ($role === UserRole::RouteManager) {
            $base->where(function (Builder $q) use ($viewer): void {
                $q->whereNull('driver_user_id')
                    ->orWhere('driver_user_id', (int) $viewer->getKey());
            });
        }
    }

    private function countRoutesMissingDriver(User $viewer): int
    {
        $q = OperationalRoute::query()
            ->whereNull('driver_user_id')
            ->whereIn('route_status', [
                OperationalRouteStatus::Draft,
                OperationalRouteStatus::Scheduled,
                OperationalRouteStatus::InProgress,
            ]);

        $this->restrictOperationalRoutesForViewer($q, $viewer);

        return (int) $q->count();
    }

    private function countOrdersMissingKnives(): int
    {
        return (int) Order::query()
            ->whereIn('order_status', [
                OrderStatus::Received,
                OrderStatus::Inspection,
                OrderStatus::InProgress,
                OrderStatus::QualityCheck,
            ])
            ->whereDoesntHave('knives')
            ->count();
    }

    private function countOrdersMissingWorkshopPhotos(): int
    {
        if (! Schema::hasTable('evidence_photos')) {
            return 0;
        }

        return (int) Order::query()
            ->whereIn('order_status', [
                OrderStatus::Inspection,
                OrderStatus::InProgress,
                OrderStatus::QualityCheck,
            ])
            ->whereDoesntHave('evidencePhotos', function (Builder $q): void {
                $q->whereNull('archived_at');
            })
            ->count();
    }

    private function countOrdersReadyForInvoice(): int
    {
        return (int) Order::query()
            ->where('order_status', OrderStatus::Completed)
            ->whereDoesntHave('invoices', function (Builder $q): void {
                $q->where('invoice_status', '!=', InvoiceStatus::Void);
            })
            ->count();
    }

    private function countInvoicesUnpaid(): int
    {
        return (int) Invoice::query()
            ->whereNotIn('invoice_status', [InvoiceStatus::Void, InvoiceStatus::Paid])
            ->whereRaw(
                'COALESCE((SELECT SUM(amount_pence) FROM payments WHERE payments.invoice_id = invoices.id), 0) < invoices.total_pence'
            )
            ->count();
    }

    private function countInvoicesOverdue(): int
    {
        return (int) Invoice::query()
            ->where('invoice_status', InvoiceStatus::Overdue)
            ->count();
    }

    private function countFailedNotificationDeliveries(): int
    {
        if (! Schema::hasTable('notification_deliveries')) {
            return 0;
        }

        return (int) NotificationDelivery::query()
            ->where('status', 'failed')
            ->count();
    }

    private function countFailedWebhookDeliveries(): int
    {
        if (! Schema::hasTable('webhook_inbox')) {
            return 0;
        }

        return (int) WebhookInbox::query()
            ->where('processing_state', 'failed')
            ->count();
    }

    private function countOverduePayments(): int
    {
        return (int) Payment::query()
            ->where('payment_status', PaymentStatus::Overdue)
            ->count();
    }

    private function countPastDueSubscriptions(): int
    {
        if (! Schema::hasTable('company_subscriptions')) {
            return 0;
        }

        return (int) CompanySubscription::query()
            ->where('status', SubscriptionStatus::PastDue)
            ->count();
    }

    private function countOrdersWithSubscriptionOverage(): int
    {
        if (! Schema::hasColumn('orders', 'company_subscription_id')
            || ! Schema::hasColumn('orders', 'subscription_coverage')) {
            return 0;
        }

        $base = Order::query()
            ->whereNotNull('company_subscription_id')
            ->whereNotNull('subscription_coverage');

        $driver = Schema::getConnection()->getDriverName();

        // MariaDB / MySQL: Laravel's JSON "->" where can error or compare incorrectly; use EXTRACT + CAST.
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            return (int) $base->whereRaw(
                '(CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(subscription_coverage, \'$.collections_overage_for_order\')), \'0\') AS SIGNED) > 0 '
                .'OR CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(subscription_coverage, \'$.knives_overage_for_order\')), \'0\') AS SIGNED) > 0)'
            )->count();
        }

        return (int) $base->where(function (Builder $q): void {
            $q->where('subscription_coverage->collections_overage_for_order', '>', 0)
                ->orWhere('subscription_coverage->knives_overage_for_order', '>', 0);
        })->count();
    }

    private function countOpenDamageReports(): int
    {
        return (int) DamageReport::query()
            ->notArchived()
            ->where('status', DamageReportStatus::Open)
            ->count();
    }

    private function countPendingInvitedUsers(): int
    {
        return (int) User::query()
            ->where('status', UserStatus::Invited)
            ->count();
    }
}
