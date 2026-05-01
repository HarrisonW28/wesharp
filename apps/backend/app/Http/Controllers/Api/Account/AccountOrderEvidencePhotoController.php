<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Account;

use App\Models\EvidencePhoto;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class AccountOrderEvidencePhotoController extends TenantAccountController
{
    public function showFile(Request $request, Order $order, EvidencePhoto $photo): StreamedResponse
    {
        $this->authorize('view', $order);

        if ((string) $photo->order_id !== (string) $order->id) {
            abort(404);
        }

        $photo->loadMissing('uploadedFile');

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
}
