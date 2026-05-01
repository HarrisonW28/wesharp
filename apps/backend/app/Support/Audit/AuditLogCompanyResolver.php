<?php

declare(strict_types=1);

namespace App\Support\Audit;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CustomerPortalUpdate;
use App\Models\EvidencePhoto;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\Payment;
use App\Models\RouteStop;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Resolves company context for polymorphic audit rows (batch, list-safe).
 */
final class AuditLogCompanyResolver
{
    /**
     * @param  Collection<int, AuditLog>  $logs
     * @return array<string, array{id: string, name: string}|null> keyed by audit log id
     */
    public static function mapForLogs(Collection $logs): array
    {
        if ($logs->isEmpty()) {
            return [];
        }

        /** @var array<string, list<string>> $idsByType */
        $idsByType = [];
        foreach ($logs as $log) {
            $type = (string) $log->auditable_type;
            $idsByType[$type] ??= [];
            $idsByType[$type][] = (string) $log->auditable_id;
        }

        $companyByEntity = [];

        foreach ($idsByType as $type => $ids) {
            $ids = array_values(array_unique($ids));
            match ($type) {
                Company::class => self::mergeCompanyRows($companyByEntity, Company::class, $ids),
                Booking::class => self::mergeBookingCompanies($companyByEntity, $ids),
                Order::class => self::mergeOrderCompanies($companyByEntity, $ids),
                Invoice::class => self::mergeInvoiceCompanies($companyByEntity, $ids),
                Payment::class => self::mergePaymentCompanies($companyByEntity, $ids),
                Knife::class => self::mergeKnifeCompanies($companyByEntity, $ids),
                User::class => self::mergeUserCompanies($companyByEntity, $ids),
                RouteStop::class => self::mergeRouteStopCompanies($companyByEntity, $ids),
                EvidencePhoto::class => self::mergeEvidencePhotoCompanies($companyByEntity, $ids),
                CustomerPortalUpdate::class => self::mergeCustomerPortalUpdateCompanies($companyByEntity, $ids),
                OperationalRoute::class => null,
                default => null,
            };
        }

        $names = self::companyNames(array_unique(array_filter(array_map(
            static fn (?array $row): ?string => $row['id'] ?? null,
            array_values($companyByEntity)
        ))));

        $out = [];
        foreach ($logs as $log) {
            $key = $log->auditable_type.'|'.$log->auditable_id;
            $row = $companyByEntity[$key] ?? null;
            if ($row === null || ! isset($row['id'])) {
                $out[(string) $log->id] = null;
            } else {
                $cid = (string) $row['id'];
                $out[(string) $log->id] = [
                    'id' => $cid,
                    'name' => $names[$cid] ?? 'Company',
                ];
            }
        }

        return $out;
    }

    /**
     * @param  array<string, array{id: string}|null>  $target
     * @param  list<string>  $ids
     */
    private static function mergeCompanyRows(array &$target, string $class, array $ids): void
    {
        foreach ($ids as $id) {
            $target[$class.'|'.$id] = ['id' => $id];
        }
    }

    /**
     * @param  array<string, array{id: string}|null>  $target
     * @param  list<string>  $ids
     */
    private static function mergeBookingCompanies(array &$target, array $ids): void
    {
        $rows = Booking::query()->whereIn('id', $ids)->get(['id', 'company_id']);
        foreach ($rows as $b) {
            $target[Booking::class.'|'.$b->id] = ['id' => (string) $b->company_id];
        }
    }

    /**
     * @param  array<string, array{id: string}|null>  $target
     * @param  list<string>  $ids
     */
    private static function mergeOrderCompanies(array &$target, array $ids): void
    {
        $rows = Order::query()->whereIn('id', $ids)->get(['id', 'company_id']);
        foreach ($rows as $o) {
            $target[Order::class.'|'.$o->id] = ['id' => (string) $o->company_id];
        }
    }

    /**
     * @param  array<string, array{id: string}|null>  $target
     * @param  list<string>  $ids
     */
    private static function mergeInvoiceCompanies(array &$target, array $ids): void
    {
        $rows = Invoice::query()->whereIn('id', $ids)->get(['id', 'company_id']);
        foreach ($rows as $i) {
            $target[Invoice::class.'|'.$i->id] = ['id' => (string) $i->company_id];
        }
    }

    /**
     * @param  array<string, array{id: string}|null>  $target
     * @param  list<string>  $ids
     */
    private static function mergePaymentCompanies(array &$target, array $ids): void
    {
        $rows = Payment::query()->whereIn('id', $ids)->get(['id', 'company_id']);
        foreach ($rows as $p) {
            $target[Payment::class.'|'.$p->id] = ['id' => (string) $p->company_id];
        }
    }

    /**
     * @param  array<string, array{id: string}|null>  $target
     * @param  list<string>  $ids
     */
    private static function mergeKnifeCompanies(array &$target, array $ids): void
    {
        $rows = Knife::query()->whereIn('id', $ids)->get(['id', 'company_id']);
        foreach ($rows as $k) {
            $target[Knife::class.'|'.$k->id] = ['id' => (string) $k->company_id];
        }
    }

    /**
     * @param  array<string, array{id: string}|null>  $target
     * @param  list<string>  $ids
     */
    private static function mergeUserCompanies(array &$target, array $ids): void
    {
        $rows = User::query()->whereIn('id', $ids)->get(['id', 'company_id']);
        foreach ($rows as $u) {
            $key = User::class.'|'.$u->getKey();
            $target[$key] = $u->company_id !== null ? ['id' => (string) $u->company_id] : null;
        }
    }

    /**
     * @param  array<string, array{id: string}|null>  $target
     * @param  list<string>  $ids
     */
    /**
     * @param  array<string, array{id: string}|null>  $target
     * @param  list<string>  $ids
     */
    /**
     * @param  array<string, array{id: string}|null>  $target
     * @param  list<string>  $ids
     */
    private static function mergeCustomerPortalUpdateCompanies(array &$target, array $ids): void
    {
        $rows = CustomerPortalUpdate::query()->whereIn('id', $ids)->get(['id', 'company_id']);
        foreach ($rows as $row) {
            $target[CustomerPortalUpdate::class.'|'.$row->id] = ['id' => (string) $row->company_id];
        }
    }

    private static function mergeEvidencePhotoCompanies(array &$target, array $ids): void
    {
        $rows = EvidencePhoto::query()->whereIn('id', $ids)->get(['id', 'order_id', 'route_stop_id']);
        $orderIds = $rows->pluck('order_id')->filter()->unique()->values()->all();
        $stopIds = $rows->pluck('route_stop_id')->filter()->unique()->values()->all();

        $orders = $orderIds !== []
            ? Order::query()->whereIn('id', $orderIds)->get(['id', 'company_id'])->keyBy('id')
            : collect();

        $stops = $stopIds !== []
            ? RouteStop::query()->whereIn('id', $stopIds)->get(['id', 'booking_id'])->keyBy('id')
            : collect();

        $bookingIds = $stops->pluck('booking_id')->filter()->unique()->values()->all();
        $bookings = $bookingIds !== []
            ? Booking::query()->whereIn('id', $bookingIds)->get(['id', 'company_id'])->keyBy('id')
            : collect();

        foreach ($rows as $row) {
            $key = EvidencePhoto::class.'|'.$row->id;
            if ($row->order_id !== null && isset($orders[(string) $row->order_id])) {
                $target[$key] = ['id' => (string) $orders[(string) $row->order_id]->company_id];

                continue;
            }
            if ($row->route_stop_id !== null && isset($stops[(string) $row->route_stop_id])) {
                $bid = $stops[(string) $row->route_stop_id]->booking_id;
                if ($bid !== null && isset($bookings[(string) $bid])) {
                    $target[$key] = ['id' => (string) $bookings[(string) $bid]->company_id];
                } else {
                    $target[$key] = null;
                }

                continue;
            }
            $target[$key] = null;
        }
    }

    private static function mergeRouteStopCompanies(array &$target, array $ids): void
    {
        $stops = RouteStop::query()->whereIn('id', $ids)->get(['id', 'booking_id']);
        $bookingIds = $stops->pluck('booking_id')->filter()->unique()->values()->all();
        if ($bookingIds === []) {
            return;
        }
        $bookings = Booking::query()->whereIn('id', $bookingIds)->get(['id', 'company_id'])->keyBy('id');
        foreach ($stops as $stop) {
            $bid = $stop->booking_id;
            if ($bid === null || ! isset($bookings[(string) $bid])) {
                $target[RouteStop::class.'|'.$stop->id] = null;
            } else {
                $target[RouteStop::class.'|'.$stop->id] = [
                    'id' => (string) $bookings[(string) $bid]->company_id,
                ];
            }
        }
    }

    /**
     * @param  list<string>  $companyIds
     * @return array<string, string>
     */
    private static function companyNames(array $companyIds): array
    {
        if ($companyIds === []) {
            return [];
        }
        $rows = Company::query()->whereIn('id', $companyIds)->get(['id', 'name']);

        return $rows->mapWithKeys(fn (Company $c): array => [(string) $c->id => (string) $c->name])->all();
    }
}
