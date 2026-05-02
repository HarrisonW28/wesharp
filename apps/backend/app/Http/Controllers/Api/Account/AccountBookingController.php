<?php

namespace App\Http\Controllers\Api\Account;

use App\Actions\Bookings\CancelBookingAction;
use App\Actions\Bookings\CreateCustomerPortalBookingAction;
use App\Http\Requests\Account\AccountStoreBookingRequest;
use App\Http\Requests\CancelBookingRequest;
use App\Models\Booking;
use App\Support\ApiResponses;
use App\Support\Portal\PortalBookingPayload;
use App\Support\Portal\BookingTrackingToken;
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

    public function store(AccountStoreBookingRequest $request, CreateCustomerPortalBookingAction $createBooking): JsonResponse
    {
        $this->authorize('create', Booking::class);

        $companyId = $this->tenantCompanyId($request);

        /** @phpstan-ignore-next-line */
        $booking = $createBooking->execute($request, $companyId, $request->bookingPayload());

        return ApiResponses::success(PortalBookingPayload::list($request, $booking), 201);
    }

    public function show(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('view', $booking);

        return ApiResponses::success(PortalBookingPayload::detail($request, $booking));
    }

    public function trackingLink(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('view', $booking);

        if ((string) $booking->company_id !== $this->tenantCompanyId($request)) {
            abort(403);
        }

        $token = BookingTrackingToken::mint($booking);
        $base = rtrim((string) config('wesharp.customer_portal_base_url'), '/');
        $path = '/track/'.$token;

        return ApiResponses::success([
            'tracking_url' => $base !== '' ? $base.$path : $path,
        ]);
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
