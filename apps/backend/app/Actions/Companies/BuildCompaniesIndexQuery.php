<?php

namespace App\Actions\Companies;

use App\Enums\CompanyStatus;
use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Support\Crm\CompanyCrmOverview;
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

        $query->selectRaw(
            '(exists(select 1 from invoices i where i.company_id = companies.id and i.invoice_status not in (?, ?))) as crm_has_unpaid_invoice',
            [InvoiceStatus::Paid->value, InvoiceStatus::Void->value]
        );

        $activeBookingValues = CompanyCrmOverview::activeBookingStatusValues();
        $placeholders = implode(',', array_fill(0, count($activeBookingValues), '?'));
        $query->selectRaw(
            '(select CASE WHEN EXISTS (select 1 from bookings b where b.company_id = companies.id and b.booking_status in ('.$placeholders.')) THEN 1 ELSE 0 END) as crm_has_active_booking',
            $activeBookingValues
        );

        $query->selectSub(
            CompanySubscription::query()
                ->select('status')
                ->whereColumn('company_id', 'companies.id')
                ->whereIn('status', [
                    SubscriptionStatus::Active->value,
                    SubscriptionStatus::PastDue->value,
                ])
                ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
                ->limit(1),
            'crm_subscription_status'
        );

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

        match (self::triState($request->query('has_unpaid_invoices'))) {
            'yes' => $query->whereHas('invoices', fn (Builder $q): Builder => $q->outstanding()),
            'no' => $query->whereDoesntHave('invoices', fn (Builder $q): Builder => $q->outstanding()),
            default => null,
        };

        match (self::triState($request->query('has_active_bookings'))) {
            'yes' => $query->whereHas(
                'bookings',
                fn (Builder $q) => $q->whereIn('booking_status', CompanyCrmOverview::activeBookingStatusValues())
            ),
            'no' => $query->whereDoesntHave(
                'bookings',
                fn (Builder $q) => $q->whereIn('booking_status', CompanyCrmOverview::activeBookingStatusValues())
            ),
            default => null,
        };

        $subscriptionStatus = trim((string) $request->query('subscription_status', ''));
        if ($subscriptionStatus === 'none') {
            $query->whereDoesntHave('operationalSubscription');
        } elseif ($subscriptionStatus !== '') {
            $query->whereHas(
                'subscriptions',
                fn (Builder $q) => $q->where('status', $subscriptionStatus)
            );
        }

        match ($sort) {
            'total_spend' => $query->orderByRaw('total_spend_pence '.$direction),
            'last_booking' => $query->orderByRaw('last_booking_date IS NULL, last_booking_date '.($direction === 'desc' ? 'desc' : 'asc')),
            'city' => $query->orderBy('companies.city', $direction),
            default => $query->orderBy('companies.name', $direction),
        };

        return $query;
    }

    /**
     * @return 'yes'|'no'|'any'
     */
    private static function triState(mixed $value): string
    {
        if ($value === null) {
            return 'any';
        }

        if (is_bool($value)) {
            return $value ? 'yes' : 'no';
        }

        $s = strtolower(trim((string) $value));
        if ($s === '' || $s === 'any') {
            return 'any';
        }

        if (in_array($s, ['1', 'true', 'yes', 'on'], true)) {
            return 'yes';
        }

        if (in_array($s, ['0', 'false', 'no', 'off'], true)) {
            return 'no';
        }

        return 'any';
    }
}
