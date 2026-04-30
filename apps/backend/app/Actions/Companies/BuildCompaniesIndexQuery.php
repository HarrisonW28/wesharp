<?php

namespace App\Actions\Companies;

use App\Enums\CompanyStatus;
use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Applies search, filtering, aggregates, sorting for CRM list (shared driver + tests).
 */
final class BuildCompaniesIndexQuery
{
    /** @phpstan-return Builder<Company> */
    public function execute(Request $request): Builder
    {
        $search = trim((string) $request->query('q', ''));
        $city = trim((string) $request->query('city', ''));
        $status = trim((string) $request->query('status', ''));
        $sort = strtolower((string) $request->query('sort', 'name'));
        $direction = strtolower((string) $request->query('direction', 'asc')) === 'desc' ? 'desc' : 'asc';

        if (! in_array($sort, ['name', 'total_spend', 'last_booking', 'city'], true)) {
            $sort = 'name';
        }

        $query = Company::query()
            ->select('companies.*')
            ->selectRaw('(select COALESCE(SUM(orders.total_pence), 0) from orders where orders.company_id = companies.id) as total_spend_pence')
            ->selectRaw('(select MAX(bookings.scheduled_date) from bookings where bookings.company_id = companies.id) as last_booking_date')
            ->withCount(['contacts', 'locations']);

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function (Builder $q) use ($like): void {
                $q->where('companies.name', 'like', $like)
                    ->orWhere('companies.slug', 'like', $like)
                    ->orWhere('companies.billing_email', 'like', $like)
                    ->orWhere('companies.city', 'like', $like);
            });
        }

        if ($city !== '') {
            $query->where('companies.city', $city);
        }

        if ($status !== '') {
            $enum = CompanyStatus::tryFrom($status);
            if ($enum !== null) {
                $query->where('companies.company_status', $enum);
            }
        }

        match ($sort) {
            'total_spend' => $query->orderByRaw('total_spend_pence '.$direction),
            'last_booking' => $query->orderByRaw('last_booking_date IS NULL, last_booking_date '.($direction === 'desc' ? 'desc' : 'asc')),
            'city' => $query->orderBy('companies.city', $direction),
            default => $query->orderBy('companies.name', $direction),
        };

        return $query;
    }
}
