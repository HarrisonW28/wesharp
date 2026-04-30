<?php

namespace App\Http\Controllers\Api\Account;

use App\Actions\Bookings\CancelBookingAction;
use App\Enums\BookingStatus;
use App\Http\Requests\Account\AccountStoreBookingRequest;
use App\Http\Requests\CancelBookingRequest;
use App\Models\Booking;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Portal\PortalBookingPayload;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountBookingController extends TenantAccountController
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Booking::class);

        $companyId = $this->tenantCompanyId($request);
        $perPage = min(50, max(1, (int) $request->query('per_page', 25)));

        $paginator = Booking::query()
            ->where('company_id', $companyId)
            ->with(['company:id,name,city', 'location:id,label,line_one,city'])
            ->orderByDesc('scheduled_date')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(function (Booking $booking) use ($request): array {
            return PortalBookingPayload::list($request, $booking);
        });

        return ApiResponses::paginated($paginator, 'items');
    }

    public function store(AccountStoreBookingRequest $request): JsonResponse
    {
        $this->authorize('create', Booking::class);

        $payload = $request->bookingPayload();

        /** @phpstan-ignore-next-line */
        $day = Carbon::parse($payload['requested_date'])->timezone('UTC')->startOfDay();

        /** @phpstan-ignore-next-line */
        $booking = Booking::query()->create([
            'company_id' => $this->tenantCompanyId($request),
            'company_location_id' => $payload['location_id'],
            'contact_id' => null,
            'booking_status' => BookingStatus::Requested,
            'service_type' => $payload['service_type'],
            'scheduled_date' => $day,
            'requested_collection_date' => $day,
            'requested_time_window_start' => $payload['time_window_start'],
            'requested_time_window_end' => $payload['time_window_end'],
            'time_window_start' => $payload['time_window_start'],
            'time_window_end' => $payload['time_window_end'],
            'estimated_knife_count' => $payload['estimated_knife_count'],
            'actual_knife_count' => null,
            'customer_notes' => $payload['customer_notes'],
            'internal_notes' => null,
            'price_estimate_pence' => null,
        ]);

        AuditRecorder::record($request->user(), $booking, 'booking.customer_portal_requested', [
            'company_id' => (string) $booking->company_id,
            'location_id' => (string) $booking->company_location_id,
            'scheduled_date' => $booking->scheduled_date?->format('Y-m-d'),
        ], $request);

        $booking->load(['company:id,name,city', 'location:id,city,line_one']);

        return ApiResponses::success(PortalBookingPayload::list($request, $booking), 201);
    }

    public function show(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('view', $booking);

        return ApiResponses::success(PortalBookingPayload::detail($request, $booking));
    }

    public function cancel(CancelBookingRequest $request, Booking $booking, CancelBookingAction $cancelBookingAction): JsonResponse
    {
        $this->authorize('cancel', $booking);

        if ((string) $booking->company_id !== $this->tenantCompanyId($request)) {
            abort(403);
        }

        $validated = $request->validated();

        /** @phpstan-ignore-next-line */
        $booking = $cancelBookingAction->execute(
            $booking,
            $request->user(),
            $request,
            $validated['reason'] ?? null
        );

        $booking->load(['company:id,name,city', 'location:id,city,line_one']);

        return ApiResponses::success(PortalBookingPayload::list($request, $booking));
    }
}
