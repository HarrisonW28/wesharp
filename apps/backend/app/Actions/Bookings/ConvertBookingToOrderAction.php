<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Models\Booking;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use App\Support\Bookings\BookingStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ConvertBookingToOrderAction
{
    public function execute(Booking $booking, ?Authenticatable $actor, ?Request $request): Order
    {
        return DB::transaction(function () use ($booking, $actor, $request): Order {
            if ($booking->orders()->exists()) {
                abort(422, 'An order already exists for this booking.');
            }

            if (! in_array($booking->booking_status, [
                BookingStatus::Confirmed,
                BookingStatus::AssignedToRoute,
                BookingStatus::Collected,
            ], true)) {
                abort(422, 'Booking must be confirmed, assigned to a route, or collected before conversion.');
            }

            $order = Order::query()->create([
                'company_id' => $booking->company_id,
                'booking_id' => $booking->id,
                'route_id' => $booking->assigned_route_id,
                'order_status' => OrderStatus::Draft,
                'knife_count' => 0,
                'price_per_knife_pence' => null,
                'discount_pence' => 0,
                'payment_status' => OrderPaymentStatus::Unpaid,
                'subtotal_pence' => 0,
                'tax_pence' => 0,
                'total_pence' => 0,
                'currency' => 'GBP',
            ]);

            $fromStatus = $booking->booking_status;
            BookingStatusTransitions::assertCanTransition($fromStatus, BookingStatus::ConvertedToOrder);
            $booking->booking_status = BookingStatus::ConvertedToOrder;
            $booking->save();

            AuditRecorder::record($actor, $booking, 'booking.converted_to_order', [
                'order_id' => (string) $order->id,
                'from_status' => $fromStatus->value,
                'to_status' => BookingStatus::ConvertedToOrder->value,
            ], $request);

            AuditRecorder::record($actor, $order, 'order.created_from_booking', [
                'booking_id' => (string) $booking->id,
            ], $request);

            return $order;
        });
    }
}
