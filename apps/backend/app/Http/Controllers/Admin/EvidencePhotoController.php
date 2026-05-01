<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\EvidencePhotoCategory;
use App\Enums\EvidencePhotoVisibility;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDamageReportEvidencePhotoRequest;
use App\Http\Requests\StoreKnifeEvidencePhotoRequest;
use App\Http\Requests\StoreOrderEvidencePhotoRequest;
use App\Http\Requests\StoreRouteStopEvidencePhotoRequest;
use App\Http\Requests\UpdateEvidencePhotoRequest;
use App\Models\DamageReport;
use App\Models\EvidencePhoto;
use App\Models\Knife;
use App\Models\Order;
use App\Models\RouteStop;
use App\Models\UploadedFile;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Evidence\EvidencePhotoJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class EvidencePhotoController extends Controller
{
    public function storeForRouteStop(StoreRouteStopEvidencePhotoRequest $request, RouteStop $stop): JsonResponse
    {
        $this->authorize('manage', $stop);

        /** @var array{category: string, caption?: ?string, notes?: ?string, knife_id?: ?string} $data */
        $data = $request->validated();
        $category = EvidencePhotoCategory::from($data['category']);

        /** @phpstan-ignore-next-line */
        $file = $request->file('photo');
        /** @phpstan-ignore-next-line */
        $path = $file->store('route-stop-evidence/'.(string) $stop->getKey(), 'local');

        /** @phpstan-ignore-next-line */
        $uploaded = UploadedFile::query()->create([
            'fileable_type' => RouteStop::class,
            'fileable_id' => $stop->id,
            'disk' => 'local',
            'path' => $path,
            /** @phpstan-ignore-next-line */
            'original_filename' => $file->getClientOriginalName(),
            /** @phpstan-ignore-next-line */
            'mime_type' => (string) $file->getMimeType(),
            /** @phpstan-ignore-next-line */
            'byte_size' => (int) $file->getSize(),
        ]);

        $stop->loadMissing('booking');
        $orderId = $stop->booking !== null
            ? $stop->booking->orders()->orderBy('created_at')->value('id')
            : null;

        $visibility = $this->normalizeVisibility($request->input('visibility'));

        /** @phpstan-ignore-next-line */
        $knifeId = isset($data['knife_id']) && $data['knife_id'] !== '' ? $data['knife_id'] : null;

        /** @var EvidencePhoto $photo */
        $photo = EvidencePhoto::query()->create([
            'uploaded_file_id' => $uploaded->id,
            /** @phpstan-ignore-next-line */
            'uploaded_by_user_id' => $request->user()?->getAuthIdentifier(),
            'captured_at' => now(),
            'route_stop_id' => $stop->id,
            'order_id' => $orderId,
            'knife_id' => $knifeId,
            'category' => $category,
            'visibility' => $visibility,
            'caption' => $data['caption'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        AuditRecorder::record($request->user(), $photo, 'evidence_photo.uploaded', [
            'category' => $category->value,
            'visibility' => $visibility->value,
            'route_stop_id' => (string) $stop->id,
            'order_id' => $orderId !== null ? (string) $orderId : null,
        ], $request);

        $photo->load(['uploadedBy:id,name']);

        return ApiResponses::success(EvidencePhotoJson::adminRow($photo), 201);
    }

    public function storeForOrder(StoreOrderEvidencePhotoRequest $request, Order $order): JsonResponse
    {
        $this->authorize('update', $order);

        /** @var array{category: string, caption?: ?string, notes?: ?string, knife_id?: ?string, damage_report_id?: ?string} $data */
        $data = $request->validated();
        $category = EvidencePhotoCategory::from($data['category']);

        /** @phpstan-ignore-next-line */
        $file = $request->file('photo');
        /** @phpstan-ignore-next-line */
        $path = $file->store('order-evidence/'.(string) $order->getKey(), 'local');

        /** @phpstan-ignore-next-line */
        $uploaded = UploadedFile::query()->create([
            'fileable_type' => Order::class,
            'fileable_id' => $order->id,
            'disk' => 'local',
            'path' => $path,
            /** @phpstan-ignore-next-line */
            'original_filename' => $file->getClientOriginalName(),
            /** @phpstan-ignore-next-line */
            'mime_type' => (string) $file->getMimeType(),
            /** @phpstan-ignore-next-line */
            'byte_size' => (int) $file->getSize(),
        ]);

        $visibility = $this->normalizeVisibility($request->input('visibility'));

        /** @phpstan-ignore-next-line */
        $knifeId = isset($data['knife_id']) && $data['knife_id'] !== '' ? $data['knife_id'] : null;
        /** @phpstan-ignore-next-line */
        $damageReportId = isset($data['damage_report_id']) && $data['damage_report_id'] !== '' ? $data['damage_report_id'] : null;

        /** @var EvidencePhoto $photo */
        $photo = EvidencePhoto::query()->create([
            'uploaded_file_id' => $uploaded->id,
            /** @phpstan-ignore-next-line */
            'uploaded_by_user_id' => $request->user()?->getAuthIdentifier(),
            'captured_at' => now(),
            'route_stop_id' => null,
            'order_id' => $order->id,
            'knife_id' => $knifeId,
            'damage_report_id' => $damageReportId,
            'category' => $category,
            'visibility' => $visibility,
            'caption' => $data['caption'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        AuditRecorder::record($request->user(), $photo, 'evidence_photo.uploaded', [
            'category' => $category->value,
            'visibility' => $visibility->value,
            'order_id' => (string) $order->id,
            'knife_id' => $knifeId !== null ? (string) $knifeId : null,
            'damage_report_id' => $damageReportId !== null ? (string) $damageReportId : null,
        ], $request);

        $photo->load(['uploadedBy:id,name']);

        return ApiResponses::success(EvidencePhotoJson::adminRow($photo), 201);
    }

    public function storeForKnife(StoreKnifeEvidencePhotoRequest $request, Knife $knife): JsonResponse
    {
        $this->authorize('update', $knife);

        /** @var array{category: string, caption?: ?string, notes?: ?string} $data */
        $data = $request->validated();
        $category = EvidencePhotoCategory::from($data['category']);

        /** @phpstan-ignore-next-line */
        $file = $request->file('photo');
        /** @phpstan-ignore-next-line */
        $path = $file->store('knife-evidence/'.(string) $knife->getKey(), 'local');

        /** @phpstan-ignore-next-line */
        $uploaded = UploadedFile::query()->create([
            'fileable_type' => Knife::class,
            'fileable_id' => $knife->id,
            'disk' => 'local',
            'path' => $path,
            /** @phpstan-ignore-next-line */
            'original_filename' => $file->getClientOriginalName(),
            /** @phpstan-ignore-next-line */
            'mime_type' => (string) $file->getMimeType(),
            /** @phpstan-ignore-next-line */
            'byte_size' => (int) $file->getSize(),
        ]);

        $visibility = $this->normalizeVisibility($request->input('visibility'));
        $orderId = $knife->order_id;

        /** @var EvidencePhoto $photo */
        $photo = EvidencePhoto::query()->create([
            'uploaded_file_id' => $uploaded->id,
            /** @phpstan-ignore-next-line */
            'uploaded_by_user_id' => $request->user()?->getAuthIdentifier(),
            'captured_at' => now(),
            'route_stop_id' => null,
            'order_id' => $orderId,
            'knife_id' => $knife->id,
            'damage_report_id' => null,
            'category' => $category,
            'visibility' => $visibility,
            'caption' => $data['caption'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        AuditRecorder::record($request->user(), $photo, 'evidence_photo.uploaded', [
            'category' => $category->value,
            'visibility' => $visibility->value,
            'knife_id' => (string) $knife->id,
            'order_id' => $orderId !== null ? (string) $orderId : null,
        ], $request);

        $photo->load(['uploadedBy:id,name']);

        return ApiResponses::success(EvidencePhotoJson::adminRow($photo), 201);
    }

    public function storeForDamageReport(StoreDamageReportEvidencePhotoRequest $request, DamageReport $damageReport): JsonResponse
    {
        $this->authorize('update', $damageReport);

        $damageReport->loadMissing('knife');

        /** @var array{category: string, caption?: ?string, notes?: ?string} $data */
        $data = $request->validated();
        $category = EvidencePhotoCategory::from($data['category']);

        /** @phpstan-ignore-next-line */
        $file = $request->file('photo');
        /** @phpstan-ignore-next-line */
        $path = $file->store('damage-report-evidence/'.(string) $damageReport->getKey(), 'local');

        /** @phpstan-ignore-next-line */
        $uploaded = UploadedFile::query()->create([
            'fileable_type' => DamageReport::class,
            'fileable_id' => $damageReport->id,
            'disk' => 'local',
            'path' => $path,
            /** @phpstan-ignore-next-line */
            'original_filename' => $file->getClientOriginalName(),
            /** @phpstan-ignore-next-line */
            'mime_type' => (string) $file->getMimeType(),
            /** @phpstan-ignore-next-line */
            'byte_size' => (int) $file->getSize(),
        ]);

        $visibility = $this->normalizeVisibility($request->input('visibility'));
        $orderId = $damageReport->order_id ?? $damageReport->knife?->order_id;
        $knifeId = (string) $damageReport->knife_id;

        /** @var EvidencePhoto $photo */
        $photo = EvidencePhoto::query()->create([
            'uploaded_file_id' => $uploaded->id,
            /** @phpstan-ignore-next-line */
            'uploaded_by_user_id' => $request->user()?->getAuthIdentifier(),
            'captured_at' => now(),
            'route_stop_id' => null,
            'order_id' => $orderId,
            'knife_id' => $knifeId,
            'damage_report_id' => $damageReport->id,
            'category' => $category,
            'visibility' => $visibility,
            'caption' => $data['caption'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        AuditRecorder::record($request->user(), $photo, 'evidence_photo.uploaded', [
            'category' => $category->value,
            'visibility' => $visibility->value,
            'damage_report_id' => (string) $damageReport->id,
            'knife_id' => $knifeId,
            'order_id' => $orderId !== null ? (string) $orderId : null,
        ], $request);

        $photo->load(['uploadedBy:id,name']);

        return ApiResponses::success(EvidencePhotoJson::adminRow($photo), 201);
    }

    public function update(UpdateEvidencePhotoRequest $request, EvidencePhoto $photo): JsonResponse
    {
        $this->authorize('update', $photo);

        /** @var array<string, mixed> $validated */
        $validated = $request->validated();

        if (array_key_exists('visibility', $validated)) {
            /** @var string $visStr */
            $visStr = $validated['visibility'];
            $newVis = EvidencePhotoVisibility::from($visStr);
            if ($newVis === EvidencePhotoVisibility::CustomerVisible) {
                $this->authorize('setCustomerVisible', $photo);
            }
            $newVis = $this->normalizeVisibility($visStr);
            $before = $photo->visibility?->value;
            if ($before !== $newVis->value) {
                $photo->visibility = $newVis;
                AuditRecorder::record($request->user(), $photo, 'evidence_photo.visibility_changed', [
                    'from' => $before,
                    'to' => $newVis->value,
                ], $request);
            }
        }

        if (array_key_exists('caption', $validated)) {
            /** @phpstan-ignore-next-line */
            $photo->caption = $validated['caption'];
        }

        if (array_key_exists('notes', $validated)) {
            /** @phpstan-ignore-next-line */
            $photo->notes = $validated['notes'];
        }

        if (! empty($validated['archived'])) {
            $this->authorize('archive', $photo);
            if ($photo->archived_at === null) {
                $photo->archived_at = now();
                AuditRecorder::record($request->user(), $photo, 'evidence_photo.archived', [
                    'category' => $photo->category?->value,
                ], $request);
            }
        }

        $photo->save();
        $photo->load(['uploadedBy:id,name']);

        return ApiResponses::success(EvidencePhotoJson::adminRow($photo));
    }

    public function showFile(Request $request, EvidencePhoto $photo): StreamedResponse
    {
        $photo->loadMissing(['uploadedFile', 'routeStop', 'order']);

        $this->authorize('viewFile', $photo);

        /** @phpstan-ignore-next-line */
        $uploaded = $photo->uploadedFile;
        if ($uploaded === null) {
            abort(404);
        }

        /** @phpstan-ignore-next-line */
        if (! Storage::disk((string) $uploaded->disk)->exists((string) $uploaded->path)) {
            abort(404);
        }

        /** @phpstan-ignore-next-line */
        return Storage::disk((string) $uploaded->disk)->response(
            (string) $uploaded->path,
            (string) $uploaded->original_filename,
            [
                /** @phpstan-ignore-next-line */
                'Content-Type' => (string) ($uploaded->mime_type ?? 'application/octet-stream'),
                'Cache-Control' => 'private, max-age=0, must-revalidate',
            ]
        );
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
