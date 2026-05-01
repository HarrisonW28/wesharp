<?php

namespace App\Support\Crm;

use App\Enums\BookingStatus;
use App\Enums\OrderStatus;
use App\Support\Orders\OrderStatusPresentation;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\CompanySubscription;
use App\Models\Contact;
use App\Models\Note;
use App\Models\Order;
use Illuminate\Support\Str;

/**
 * CRM overview snapshot for company detail / summary (readable labels, link ids).
 */
final class CompanyCrmOverview
{
    private const BOOKING_TERMINAL = [
        BookingStatus::Cancelled,
        BookingStatus::Completed,
        BookingStatus::ConvertedToOrder,
        BookingStatus::NoShow,
    ];

    /** @return array<string, mixed> */
    public static function toArray(Company $company): array
    {
        $defaultLocation = self::resolveDefaultLocation($company);
        $primaryContact = self::resolvePrimaryContact($company);
        $latestBooking = self::resolveLatestBooking($company);
        $activeOrder = self::resolveActiveOrder($company);
        $subscription = $company->relationLoaded('subscription')
            ? $company->subscription
            : $company->subscription()->first();

        $unpaidBalancePence = (int) $company->invoices()->outstanding()->sum('total_pence');

        return [
            'default_location' => self::locationPayload($defaultLocation),
            'primary_contact' => self::contactPayload($primaryContact),
            'latest_booking' => self::bookingPayload($latestBooking),
            'active_order' => self::orderPayload($activeOrder),
            'unpaid_balance_pence' => $unpaidBalancePence,
            'subscription' => self::subscriptionPayload($subscription),
            'recent_activity' => self::recentActivityPreview($company),
        ];
    }

    private static function resolveDefaultLocation(Company $company): ?CompanyLocation
    {
        if ($company->relationLoaded('locations')) {
            $rows = $company->locations->filter(static fn (CompanyLocation $l) => ! $l->isArchived())->values();
            $hit = $rows->firstWhere('is_default', true);

            return $hit ?? $rows->sortBy('label')->first();
        }

        return $company->locations()
            ->active()
            ->orderByDesc('is_default')
            ->orderBy('label')
            ->first();
    }

    private static function resolvePrimaryContact(Company $company): ?Contact
    {
        if ($company->relationLoaded('contacts')) {
            $rows = $company->contacts->filter(static fn (Contact $c) => ! $c->isArchived())->values();
            $hit = $rows->firstWhere('billing_contact', true);

            return $hit ?? $rows->sortBy(fn (Contact $c) => $c->last_name.$c->first_name)->first();
        }

        return $company->contacts()
            ->active()
            ->orderByDesc('billing_contact')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->first();
    }

    private static function resolveLatestBooking(Company $company): ?Booking
    {
        if ($company->relationLoaded('bookings') && $company->bookings->isNotEmpty()) {
            return $company->bookings->sortByDesc(fn (Booking $b) => $b->scheduled_date?->timestamp ?? 0)->first();
        }

        return $company->bookings()
            ->orderByDesc('scheduled_date')
            ->first();
    }

    private static function resolveActiveOrder(Company $company): ?Order
    {
        $openStatuses = [
            OrderStatus::Draft,
            OrderStatus::Received,
            OrderStatus::Inspection,
            OrderStatus::InProgress,
            OrderStatus::QualityCheck,
            OrderStatus::Completed,
            OrderStatus::Invoiced,
        ];

        if ($company->relationLoaded('orders') && $company->orders->isNotEmpty()) {
            $candidates = $company->orders->filter(
                static fn (Order $o) => in_array($o->order_status, $openStatuses, true)
            );

            return $candidates->sortByDesc(fn (Order $o) => $o->updated_at?->timestamp ?? 0)->first();
        }

        return $company->orders()
            ->whereIn('order_status', $openStatuses)
            ->orderByDesc('updated_at')
            ->first();
    }

    /** @return array<string, mixed>|null */
    private static function locationPayload(?CompanyLocation $loc): ?array
    {
        if ($loc === null) {
            return null;
        }

        return [
            'id' => (string) $loc->id,
            'label' => $loc->label,
            'is_default' => (bool) $loc->is_default,
            'line_one' => $loc->line_one,
            'line_two' => $loc->line_two,
            'city' => $loc->city,
            'postcode' => $loc->postcode,
            'country' => $loc->country,
            'summary' => self::addressSummary($loc),
        ];
    }

    private static function addressSummary(CompanyLocation $loc): string
    {
        $parts = array_filter([
            $loc->line_one,
            $loc->line_two,
            $loc->city,
            $loc->postcode,
            $loc->country,
        ], static fn ($v) => $v !== null && $v !== '');

        return $parts !== [] ? implode(', ', $parts) : ($loc->label ?? '');
    }

    /** @return array<string, mixed>|null */
    private static function contactPayload(?Contact $c): ?array
    {
        if ($c === null) {
            return null;
        }

        $name = trim($c->first_name.' '.$c->last_name);

        return [
            'id' => (string) $c->id,
            'name' => $name !== '' ? $name : 'Contact',
            'email' => $c->email,
            'phone' => $c->phone,
            'billing_contact' => (bool) $c->billing_contact,
        ];
    }

    /** @return array<string, mixed>|null */
    private static function bookingPayload(?Booking $b): ?array
    {
        if ($b === null) {
            return null;
        }

        $status = $b->booking_status?->value;

        return [
            'id' => (string) $b->id,
            'scheduled_date' => $b->scheduled_date?->format('Y-m-d'),
            'booking_status' => $status,
            'booking_status_label' => $status !== null ? self::readable($status) : null,
            'service_type' => $b->service_type?->value,
            'service_type_label' => $b->service_type !== null ? self::readable($b->service_type->value) : null,
        ];
    }

    /** @return array<string, mixed>|null */
    private static function orderPayload(?Order $o): ?array
    {
        if ($o === null) {
            return null;
        }

        $status = $o->order_status?->value;

        return [
            'id' => (string) $o->id,
            'order_status' => $status,
            'order_status_label' => $o->order_status !== null
                ? OrderStatusPresentation::adminLabel($o->order_status)
                : null,
            'total_pence' => (int) $o->total_pence,
            'currency' => $o->currency,
        ];
    }

    /** @return array<string, mixed>|null */
    private static function subscriptionPayload(?CompanySubscription $sub): ?array
    {
        if ($sub === null) {
            return null;
        }

        $status = $sub->status;

        return [
            'id' => (string) $sub->id,
            'plan_name' => $sub->plan_name,
            'status' => $status,
            'status_label' => self::readable($status),
            'current_period_end' => $sub->current_period_end?->format('Y-m-d'),
        ];
    }

    private static function readable(string $value): string
    {
        return Str::headline(str_replace('_', ' ', $value));
    }

    /** @return list<array<string, mixed>> */
    private static function recentActivityPreview(Company $company): array
    {
        $audits = AuditLog::query()
            ->with('actor:id,name')
            ->where('auditable_type', Company::class)
            ->where('auditable_id', $company->id)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        $notes = Note::query()
            ->with('author:id,name')
            ->where('noteable_type', Company::class)
            ->where('noteable_id', $company->id)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        $combined = [];

        foreach ($audits as $row) {
            $combined[] = [
                'type' => 'audit',
                'id' => $row->id,
                'at' => $row->created_at?->toIso8601String(),
                'summary' => Str::headline(str_replace('.', ' ', (string) $row->action)),
                'action' => $row->action,
                'actor_name' => $row->actor?->name,
            ];
        }

        foreach ($notes as $row) {
            $combined[] = [
                'type' => 'note',
                'id' => $row->id,
                'at' => $row->created_at?->toIso8601String(),
                'summary' => 'Note added',
                'action' => 'note.created',
                'actor_name' => $row->author?->name,
                'body_preview' => Str::limit((string) $row->body, 120),
            ];
        }

        usort($combined, static fn (array $a, array $b): int => strtotime((string) ($b['at'] ?? '0')) <=> strtotime((string) ($a['at'] ?? '0')));

        return array_slice($combined, 0, 5);
    }

    /** @return list<string> */
    public static function activeBookingStatusValues(): array
    {
        $all = BookingStatus::cases();
        $terminal = self::BOOKING_TERMINAL;

        return array_values(array_map(
            static fn (BookingStatus $s) => $s->value,
            array_filter(
                $all,
                static fn (BookingStatus $s) => ! in_array($s, $terminal, true)
            )
        ));
    }
}
