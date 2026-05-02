<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Enums\ServiceType;
use App\Models\Booking;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Index filters used by BookingController::index — search/filter/sort.
 */
final class BuildBookingsIndexQuery
{
    /** @phpstan-return Builder<Booking> */
    public function execute(Request $request): Builder
    {
        $serviceType = strtolower(trim((string) $request->query('service_type', '')));
        $statusRaw = trim((string) $request->query('status', ''));
        $city = trim((string) $request->query('city', ''));
        $dateRaw = trim((string) $request->query('date', ''));
        $sort = strtolower((string) $request->query('sort', 'requested_date'));
        $direction = strtolower((string) $request->query('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (! in_array($sort, ['requested_date', 'status', 'city', 'created_at'], true)) {
            $sort = 'requested_date';
        }

        $query = Booking::query()
            ->with([
                'company:id,name,city',
                'location:id,city,line_one,company_id',
                'assignedRoute:id,name,route_status,scheduled_date',
            ])
            ->withCount('orders');

        if ($serviceType !== '') {
            $enumService = ServiceType::tryFrom($serviceType);

            if ($enumService !== null) {
                $query->where('service_type', $enumService->value);
            }
        }

        if ($statusRaw !== '') {
            $statusEnum = BookingStatus::tryFrom($statusRaw);

            if ($statusEnum !== null) {
                $query->where('booking_status', $statusEnum->value);
            }
        }

        if ($city !== '') {
            $query->whereHas(
                'company',
                fn (Builder $cq) => $cq->where('city', $city)
            );
        }

        if ($dateRaw !== '') {
            $ts = strtotime($dateRaw);
            if ($ts !== false) {
                $d = date('Y-m-d', $ts);
                $query->whereRaw(
                    'date(coalesce(bookings.confirmed_collection_date, bookings.requested_collection_date, bookings.scheduled_date)) = ?',
                    [$d]
                );
            }
        }

        $dateFrom = trim((string) $request->query('date_from', ''));
        $dateTo = trim((string) $request->query('date_to', ''));
        if ($dateFrom !== '' && strtotime($dateFrom) !== false) {
            $query->whereRaw(
                'date(coalesce(bookings.confirmed_collection_date, bookings.requested_collection_date, bookings.scheduled_date)) >= ?',
                [date('Y-m-d', strtotime($dateFrom))]
            );
        }
        if ($dateTo !== '' && strtotime($dateTo) !== false) {
            $query->whereRaw(
                'date(coalesce(bookings.confirmed_collection_date, bookings.requested_collection_date, bookings.scheduled_date)) <= ?',
                [date('Y-m-d', strtotime($dateTo))]
            );
        }

        $locationId = trim((string) $request->query('location_id', ''));
        if ($locationId !== '' && Str::isUuid($locationId)) {
            $query->where('bookings.company_location_id', $locationId);
        }

        $companyId = trim((string) $request->query('company_id', ''));
        if ($companyId !== '' && Str::isUuid($companyId)) {
            $query->where('bookings.company_id', $companyId);
        }

        $assignment = strtolower(trim((string) $request->query('route_assigned', '')));
        if ($assignment === 'assigned') {
            $query->whereNotNull('bookings.assigned_route_id');
        } elseif ($assignment === 'unassigned') {
            $query->whereNull('bookings.assigned_route_id');
        }

        $collectionWindow = strtolower(trim((string) $request->query('collection_window', '')));
        if ($collectionWindow === 'missing') {
            $query->whereIn('booking_status', [
                BookingStatus::Confirmed->value,
                BookingStatus::AssignedToRoute->value,
            ])->where(function (Builder $sub): void {
                $sub->whereNull('confirmed_collection_date')
                    ->orWhereNull('confirmed_time_window_start')
                    ->orWhereNull('confirmed_time_window_end');
            });
        }

        $qRaw = trim((string) $request->query('q', ''));
        if ($qRaw !== '') {
            $needle = '%'.addcslashes($qRaw, '%_\\').'%';
            $query->where(function (Builder $sub) use ($needle, $qRaw): void {
                $sub->whereHas(
                    'company',
                    fn (Builder $cq) => $cq->where('name', 'like', $needle)
                )->orWhereHas(
                    'location',
                    fn (Builder $lq) => $lq->where('line_one', 'like', $needle)
                        ->orWhere('city', 'like', $needle)
                        ->orWhere('postcode', 'like', $needle)
                );
                if (Str::isUuid($qRaw)) {
                    $sub->orWhere('bookings.id', $qRaw);
                }
            });
        }

        match ($sort) {
            'status' => $query->orderBy('booking_status', $direction),
            'city' => $query->join('companies', 'companies.id', '=', 'bookings.company_id')
                ->select('bookings.*')
                ->orderBy('companies.city', $direction),
            'created_at' => $query->orderBy('bookings.created_at', $direction),
            default => $query->orderBy('scheduled_date', $direction),
        };

        return $query;
    }
}
