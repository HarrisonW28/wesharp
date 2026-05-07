<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Enums\CompanyStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Models\Booking;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use App\Services\Notifications\BookingEmailService;
use App\Services\Orders\OrderService;
use App\Services\Pricing\PricingRuleResolver;
use App\Support\Bookings\BookingStatusTransitions;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ConfirmBookingAction
{
    public function __construct(
        private readonly BookingEmailService $bookingEmails,
    ) {}

    /**
     * @param  array<string, mixed>|null  $overrides  Optional confirmed date / window from admin (validated).
     */
    public function execute(Booking $booking, ?Authenticatable $actor, ?Request $request, ?array $overrides = null): Booking
    {
        $out = DB::transaction(function () use ($booking, $actor, $request, $overrides): Booking {
            $from = $booking->booking_status;
            BookingStatusTransitions::assertCanTransition($from, BookingStatus::Confirmed);

            $booking->booking_status = BookingStatus::Confirmed;

            if ($overrides !== null) {
                foreach (['confirmed_collection_date', 'confirmed_time_window_start', 'confirmed_time_window_end'] as $key) {
                    if (! array_key_exists($key, $overrides)) {
                        continue;
                    }
                    $val = $overrides[$key];
                    if ($val === null || $val === '') {
                        continue;
                    }
                    if ($key === 'confirmed_collection_date') {
                        $day = Carbon::parse((string) $val)->timezone('UTC')->startOfDay();
                        $booking->confirmed_collection_date = $day;
                        $booking->scheduled_date = $day;
                    } else {
                        $booking->{$key} = $val;
                    }
                }
            }

            $reqDate = $booking->requested_collection_date ?? $booking->scheduled_date;
            if ($booking->confirmed_collection_date === null && $reqDate !== null) {
                $booking->confirmed_collection_date = $reqDate;
            }

            $reqStart = $booking->requested_time_window_start ?? $booking->time_window_start;
            $reqEnd = $booking->requested_time_window_end ?? $booking->time_window_end;
            if ($booking->confirmed_time_window_start === null && $reqStart !== null) {
                $booking->confirmed_time_window_start = $reqStart;
            }
            if ($booking->confirmed_time_window_end === null && $reqEnd !== null) {
                $booking->confirmed_time_window_end = $reqEnd;
            }

            $booking->save();

            $company = $booking->company;
            if ($company !== null && $company->company_status !== CompanyStatus::Active) {
                $company->company_status = CompanyStatus::Active;
                $company->save();
            }

            if (! $booking->orders()->exists()) {
                $order = Order::query()->create([
                    'company_id' => $booking->company_id,
                    'booking_id' => $booking->id,
                    'route_id' => $booking->assigned_route_id,
                    'order_status' => OrderStatus::Draft,
                    'knife_count' => max(0, (int) ($booking->actual_knife_count ?? $booking->estimated_knife_count ?? 0)),
                    'price_per_knife_pence' => null,
                    'discount_pence' => 0,
                    'payment_status' => OrderPaymentStatus::Unpaid,
                    'subtotal_pence' => 0,
                    'tax_pence' => 0,
                    'total_pence' => 0,
                    'currency' => 'GBP',
                ]);

                $companySub = $company?->operationalSubscription()->first();
                if ($companySub !== null) {
                    $order->company_subscription_id = $companySub->id;
                    $order->save();
                } else {
                    $order->loadMissing(['booking', 'company', 'company.locations']);
                    $pence = app(PricingRuleResolver::class)->defaultUnitAmountPenceForOrder($order);
                    if ($pence !== null) {
                        $order->price_per_knife_pence = $pence;
                        $order->save();
                    }
                }
                app(OrderService::class)->rebuildMonetaryTotals($order->fresh(['knives', 'items', 'booking']));

                AuditRecorder::record($actor, $order, 'order.created_from_booking_confirmed', [
                    'booking_id' => (string) $booking->id,
                ], $request);
            }

            AuditRecorder::record($actor, $booking, 'booking.confirmed', [
                'from' => $from->value,
                'to' => BookingStatus::Confirmed->value,
                'confirmed_collection_date' => $booking->confirmed_collection_date?->format('Y-m-d'),
                'confirmed_time_window_start' => $booking->confirmed_time_window_start,
                'confirmed_time_window_end' => $booking->confirmed_time_window_end,
            ], $request);

            return $booking->fresh();
        });

        $this->bookingEmails->sendBookingConfirmed($out);

        return $out;
    }
}
