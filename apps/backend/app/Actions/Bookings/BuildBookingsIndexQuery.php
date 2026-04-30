<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Enums\ServiceType;
use App\Models\Booking;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

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
            ]);

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
                $query->whereDate('scheduled_date', date('Y-m-d', $ts));
            }
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
