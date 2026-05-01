<?php

declare(strict_types=1);

namespace App\Support\Evidence;

use App\Enums\EvidencePhotoCategory;
use App\Models\EvidencePhoto;
use App\Models\RouteStop;
use Illuminate\Validation\ValidationException;

final class EvidencePhotoRequirements
{
    public static function assertForCollected(RouteStop $stop): void
    {
        if (! config('wesharp_evidence.require_collection_photo', false)) {
            return;
        }

        self::assertCategoryPresent($stop, EvidencePhotoCategory::CollectionProof, 'Upload a collection proof photo before marking this stop collected.');
    }

    public static function assertForReturned(RouteStop $stop): void
    {
        if (! config('wesharp_evidence.require_return_photo', false)) {
            return;
        }

        self::assertCategoryPresent($stop, EvidencePhotoCategory::ReturnProof, 'Upload a return proof photo before marking this stop returned.');
    }

    public static function assertForFailedCollection(RouteStop $stop): void
    {
        if (! config('wesharp_evidence.require_failed_collection_photo', false)) {
            return;
        }

        self::assertCategoryPresent($stop, EvidencePhotoCategory::FailedCollection, 'Upload a failed collection photo before recording this failure.');
    }

    private static function assertCategoryPresent(RouteStop $stop, EvidencePhotoCategory $category, string $message): void
    {
        $exists = EvidencePhoto::query()
            ->where('route_stop_id', $stop->id)
            ->where('category', $category->value)
            ->whereNull('archived_at')
            ->exists();

        if (! $exists) {
            throw ValidationException::withMessages([
                'evidence_photo' => $message,
            ]);
        }
    }
}
