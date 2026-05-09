<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Account;

use App\Models\Knife;
use App\Models\KnifePhoto;
use App\Models\Order;
use App\Models\UploadedFile;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Http\ValidatedAttachmentRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class AccountOrderKnifePhotoController extends TenantAccountController
{
    public function store(Request $request, Order $order, Knife $knife): JsonResponse
    {
        $this->authorize('view', $order);

        if ((string) $knife->company_id !== $this->tenantCompanyId($request)) {
            abort(403);
        }

        if ($knife->order_id === null || (string) $knife->order_id !== (string) $order->id) {
            abort(422, 'This blade is not listed on this order.');
        }

        $request->validate([
            ...ValidatedAttachmentRules::imageField('photo', 8192),
            'caption' => ['nullable', 'string', 'max:500'],
        ]);

        /** @phpstan-ignore-next-line */
        $file = $request->file('photo');
        /** @phpstan-ignore-next-line */
        $path = $file->store('knife-photos/'.(string) $knife->getKey(), 'local');

        /** @phpstan-ignore-next-line */
        $uploaded = UploadedFile::query()->create([
            'fileable_type' => Knife::class,
            /** @phpstan-ignore-next-line */
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

        /** @phpstan-ignore-next-line */
        $nextOrder = (int) (KnifePhoto::query()->where('knife_id', $knife->id)->max('sort_order') ?? 0) + 1;

        /** @phpstan-ignore-next-line */
        $photo = KnifePhoto::query()->create([
            /** @phpstan-ignore-next-line */
            'knife_id' => $knife->id,
            /** @phpstan-ignore-next-line */
            'order_id' => $order->id,
            /** @phpstan-ignore-next-line */
            'uploaded_file_id' => $uploaded->id,
            /** @phpstan-ignore-next-line */
            'uploaded_by_user_id' => $request->user()?->getAuthIdentifier(),
            'sort_order' => $nextOrder,
            'caption' => $request->input('caption'),
            'photo_kind' => 'before',
        ]);

        AuditRecorder::record($request->user(), $knife, 'knife.customer_photo_added', [
            /** @phpstan-ignore-next-line */
            'knife_photo_id' => (string) $photo->id,
            'order_id' => (string) $order->id,
        ], $request);

        return ApiResponses::success([
            'id' => (string) $photo->id,
            'knife_id' => (string) $knife->id,
            'caption' => $photo->caption,
            'photo_kind' => $photo->photo_kind,
        ], 201);
    }

    public function showFile(Request $request, Order $order, KnifePhoto $photo): StreamedResponse
    {
        $this->authorize('view', $order);

        $photo->loadMissing(['knife', 'uploadedFile']);

        /** @phpstan-ignore-next-line */
        $knife = $photo->knife;
        /** @phpstan-ignore-next-line */
        $uploaded = $photo->uploadedFile;

        if ($knife === null || $uploaded === null) {
            abort(404);
        }

        if ((string) $knife->company_id !== $this->tenantCompanyId($request)) {
            abort(403);
        }

        if ($knife->order_id === null || (string) $knife->order_id !== (string) $order->id) {
            abort(404);
        }

        if ((string) $photo->knife_id !== (string) $knife->id || (string) $photo->order_id !== (string) $order->id) {
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
}
