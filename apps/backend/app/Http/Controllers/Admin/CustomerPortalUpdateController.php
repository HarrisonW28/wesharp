<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\EvidencePhotoVisibility;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerPortalUpdateRequest;
use App\Http\Requests\UpdateCustomerPortalUpdateRequest;
use App\Models\CustomerPortalUpdate;
use App\Models\Order;
use App\Models\RouteStop;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Portal\PortalCustomerUpdateJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CustomerPortalUpdateController extends Controller
{
    public function storeForRouteStop(StoreCustomerPortalUpdateRequest $request, RouteStop $stop): JsonResponse
    {
        $this->authorize('manage', $stop);

        $stop->loadMissing('booking');
        $booking = $stop->booking;
        if ($booking === null) {
            abort(422, 'This stop has no booking — add updates from an order instead.');
        }

        $orderId = $booking->orders()->orderBy('created_at')->value('id');

        $visibility = $this->normalizeVisibility($request->input('visibility'));

        /** @var CustomerPortalUpdate $update */
        $update = CustomerPortalUpdate::query()->create([
            'company_id' => $booking->company_id,
            'booking_id' => $booking->id,
            'order_id' => $orderId,
            'route_stop_id' => $stop->id,
            'body' => $request->validated('body'),
            'visibility' => $visibility,
            /** @phpstan-ignore-next-line */
            'created_by_user_id' => $request->user()?->getAuthIdentifier(),
        ]);

        AuditRecorder::record($request->user(), $update, 'portal_update.created', [
            'visibility' => $visibility->value,
            'route_stop_id' => (string) $stop->id,
        ], $request);

        $update->load('createdBy:id,name');

        return ApiResponses::success(PortalCustomerUpdateJson::adminRow($update), 201);
    }

    public function storeForOrder(StoreCustomerPortalUpdateRequest $request, Order $order): JsonResponse
    {
        $this->authorize('update', $order);

        $visibility = $this->normalizeVisibility($request->input('visibility'));

        /** @var CustomerPortalUpdate $update */
        $update = CustomerPortalUpdate::query()->create([
            'company_id' => $order->company_id,
            'booking_id' => $order->booking_id,
            'order_id' => $order->id,
            'route_stop_id' => null,
            'body' => $request->validated('body'),
            'visibility' => $visibility,
            /** @phpstan-ignore-next-line */
            'created_by_user_id' => $request->user()?->getAuthIdentifier(),
        ]);

        AuditRecorder::record($request->user(), $update, 'portal_update.created', [
            'visibility' => $visibility->value,
            'order_id' => (string) $order->id,
        ], $request);

        $update->load('createdBy:id,name');

        return ApiResponses::success(PortalCustomerUpdateJson::adminRow($update), 201);
    }

    public function update(UpdateCustomerPortalUpdateRequest $request, CustomerPortalUpdate $update): JsonResponse
    {
        $this->authorize('update', $update);

        /** @var array<string, mixed> $validated */
        $validated = $request->validated();

        if (array_key_exists('visibility', $validated)) {
            $newVis = EvidencePhotoVisibility::from($validated['visibility']);
            if ($newVis === EvidencePhotoVisibility::CustomerVisible) {
                $this->authorize('setCustomerVisible', $update);
            }
            $newVis = $this->normalizeVisibility($validated['visibility']);
            $before = $update->visibility?->value;
            if ($before !== $newVis->value) {
                $update->visibility = $newVis;
                AuditRecorder::record($request->user(), $update, 'portal_update.visibility_changed', [
                    'from' => $before,
                    'to' => $newVis->value,
                ], $request);
            }
        }

        if (array_key_exists('body', $validated)) {
            /** @phpstan-ignore-next-line */
            $update->body = $validated['body'];
        }

        if (! empty($validated['archived'])) {
            $this->authorize('archive', $update);
            if ($update->archived_at === null) {
                $update->archived_at = now();
                AuditRecorder::record($request->user(), $update, 'portal_update.archived', [], $request);
            }
        }

        $update->save();
        $update->load('createdBy:id,name');

        return ApiResponses::success(PortalCustomerUpdateJson::adminRow($update));
    }

    private function normalizeVisibility(?string $raw): EvidencePhotoVisibility
    {
        $allowCustomer = (bool) config('wesharp_evidence.allow_customer_visible_photos', true);
        $parsed = $raw !== null && $raw !== '' ? EvidencePhotoVisibility::tryFrom($raw) : null;
        $default = EvidencePhotoVisibility::tryFrom((string) config('wesharp_evidence.default_visibility', 'internal_only'))
            ?? EvidencePhotoVisibility::InternalOnly;
        $v = $parsed ?? $default;
        if (! $allowCustomer && $v === EvidencePhotoVisibility::CustomerVisible) {
            return EvidencePhotoVisibility::InternalOnly;
        }

        return $v;
    }
}
