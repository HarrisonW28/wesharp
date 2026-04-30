<?php

namespace App\Services\Account;

use App\Enums\BookingStatus;
use App\Enums\KnifeStatus;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Support\Account\CustomerSubscriptionPayload;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

final class AccountDashboardService
{
    /** @return array<string, mixed> */
    public function payload(User $user): array
    {
        /** @phpstan-ignore-next-line */
        $companyId = (string) $user->company_id;
        /** @phpstan-ignore-next-line */
        $company = Company::query()->findOrFail($companyId);

        $nowMonthStart = now('UTC')->copy()->startOfMonth();
        $nowMonthEnd = now('UTC')->copy()->endOfMonth();

        $receivedSub = Payment::query()
            ->selectRaw('invoice_id, SUM(amount_pence) AS paid_pence')
            ->whereNotNull('invoice_id')
            ->groupBy('invoice_id');

        $outstandingPence = (int) Invoice::query()
            ->outstanding()
            ->where('company_id', $companyId)
            ->leftJoinSub($receivedSub, 'ipsum', fn (JoinClause $j): JoinClause => $j->whereColumn(
                'ipsum.invoice_id',
                'invoices.id'
            ))
            ->sum(DB::raw('invoices.total_pence - COALESCE(ipsum.paid_pence, 0)'));

        $monthSpendPence = (int) Order::query()->completed()
            ->where('company_id', $companyId)
            ->whereBetween('orders.updated_at', [$nowMonthStart, $nowMonthEnd])
            ->sum('total_pence');

        $nextBooking = $this->findNextBooking($companyId);

        $lastOrder = Order::query()
            ->completed()
            ->where('company_id', $companyId)
            ->orderByDesc('updated_at')
            ->with(['booking:id,scheduled_date', 'company:id,name,city'])
            ->first();

        $knivesSharpenedLifetime = Knife::query()
            ->where('company_id', $companyId)
            ->whereIn('knife_status', [
                KnifeStatus::Sharpened,
                KnifeStatus::QualityChecked,
                KnifeStatus::Returned,
            ])
            ->count();

        return [
            'company' => [
                'id' => (string) $company->id,
                'name' => $company->name,
                'city' => $company->city,
            ],
            'kpis' => [
                'outstanding_balance_pence' => $outstandingPence,
                'monthly_spend_pence' => $monthSpendPence,
                'total_knives_sharpened' => $knivesSharpenedLifetime,
            ],
            'next_booking' => $nextBooking !== null ? $this->bookingSummaryRow($nextBooking) : null,
            'last_order' => $lastOrder !== null ? [
                'id' => (string) $lastOrder->id,
                'status' => $lastOrder->order_status?->value,
                'total_pence' => (int) $lastOrder->total_pence,
                'currency' => $lastOrder->currency,
                'updated_at' => $lastOrder->updated_at?->toIso8601String(),
                'scheduled_date' => $lastOrder->booking?->scheduled_date?->format('Y-m-d'),
            ] : null,
            'subscription' => CustomerSubscriptionPayload::forCompany($companyId),
        ];
    }

    private function findNextBooking(string $companyId): ?Booking
    {
        $todayUtc = now('UTC')->toDateString();

        return Booking::query()
            ->where('company_id', $companyId)
            ->whereNotIn('booking_status', [
                BookingStatus::Cancelled,
                BookingStatus::NoShow,
                BookingStatus::Completed,
                BookingStatus::ConvertedToOrder,
            ])
            ->whereDate('scheduled_date', '>=', $todayUtc)
            ->orderBy('scheduled_date')
            ->orderBy('created_at')
            ->first();
    }

    /** @return array<string, mixed> */
    private function bookingSummaryRow(Booking $b): array
    {
        $b->loadMissing([
            'location:id,city,line_one',
            'assignedRoute:id,name,route_status,scheduled_date',
        ]);

        return [
            'id' => (string) $b->id,
            'status' => $b->booking_status?->value,
            'scheduled_date' => $b->scheduled_date?->format('Y-m-d'),
            'time_window_start' => $b->time_window_start,
            'time_window_end' => $b->time_window_end,
            'service_type' => $b->service_type?->value,
            'location_label' => $b->location?->label ?? $b->location?->line_one,
            'venue_city' => $b->location?->city,
            'route_name' => $b->assignedRoute?->name,
        ];
    }
}
