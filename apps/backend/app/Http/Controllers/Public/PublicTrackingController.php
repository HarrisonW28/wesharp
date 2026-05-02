<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Support\ApiResponses;
use App\Support\Portal\BookingTrackingToken;
use App\Support\Portal\PortalBookingPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PublicTrackingController extends Controller
{
    public function show(Request $request, string $token): JsonResponse
    {
        $bookingId = BookingTrackingToken::parseBookingId($token);
        if ($bookingId === null) {
            abort(404);
        }

        /** @var Booking|null $booking */
        $booking = Booking::query()->find($bookingId);
        if ($booking === null) {
            abort(404);
        }

        return ApiResponses::success(PortalBookingPayload::publicTracking($request, $booking));
    }
}
