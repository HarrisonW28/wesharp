<?php

declare(strict_types=1);

namespace App\Support\Evidence;

use App\Enums\EvidencePhotoCategory;
use App\Models\EvidencePhoto;
use App\Models\Order;

final class EvidencePhotoJson
{
    /** @return array<string, mixed> */
    public static function adminRow(EvidencePhoto $photo): array
    {
        $photo->loadMissing(['uploadedBy:id,name']);

        return [
            'id' => (string) $photo->id,
            'captured_at' => $photo->captured_at?->toIso8601String(),
            'category' => $photo->category?->value,
            'category_label' => self::adminCategoryLabel($photo->category),
            'visibility' => $photo->visibility?->value,
            'caption' => $photo->caption,
            'notes' => $photo->notes,
            'archived_at' => $photo->archived_at?->toIso8601String(),
            'knife_id' => $photo->knife_id !== null ? (string) $photo->knife_id : null,
            'damage_report_id' => $photo->damage_report_id !== null ? (string) $photo->damage_report_id : null,
            'order_id' => $photo->order_id !== null ? (string) $photo->order_id : null,
            'route_stop_id' => $photo->route_stop_id !== null ? (string) $photo->route_stop_id : null,
            'uploaded_by' => $photo->uploadedBy !== null
                ? [
                    'id' => (string) $photo->uploadedBy->getKey(),
                    'name' => $photo->uploadedBy->name,
                ]
                : null,
            'file_fetch_path' => '/api/admin/evidence-photos/'.$photo->id.'/file',
        ];
    }

    /** Customer-safe row (no internal notes, no staff identities). */
    /** @return array<string, mixed> */
    public static function portalRow(EvidencePhoto $photo, Order $order): array
    {
        return [
            'id' => (string) $photo->id,
            'captured_at' => $photo->captured_at?->toIso8601String(),
            'captured_at_label' => self::friendlyTimestamp($photo),
            'category' => $photo->category?->value,
            'category_label' => self::portalCategoryLabel($photo->category),
            'caption' => $photo->caption,
            'status_line' => self::portalStatusLine($photo),
            'file_fetch_path' => '/api/account/orders/'.$order->id.'/evidence-photos/'.$photo->id.'/file',
        ];
    }

    private static function friendlyTimestamp(EvidencePhoto $photo): ?string
    {
        $at = $photo->captured_at ?? $photo->created_at;
        if ($at === null) {
            return null;
        }

        return $at->timezone(config('app.timezone'))->format('D j M Y, H:i');
    }

    private static function portalStatusLine(EvidencePhoto $photo): string
    {
        $cat = $photo->category;

        return match ($cat) {
            EvidencePhotoCategory::CollectionProof => 'Collection update',
            EvidencePhotoCategory::ReturnProof => 'Return delivery',
            EvidencePhotoCategory::FailedCollection => 'Visit update',
            EvidencePhotoCategory::GeneralRouteStop, EvidencePhotoCategory::GeneralOrder => 'Photo update',
            default => 'Update',
        };
    }

    private static function portalCategoryLabel(?EvidencePhotoCategory $category): string
    {
        return match ($category) {
            EvidencePhotoCategory::CollectionProof => 'Collection',
            EvidencePhotoCategory::ReturnProof => 'Return',
            EvidencePhotoCategory::FailedCollection => 'Visit',
            EvidencePhotoCategory::GeneralRouteStop => 'Route',
            EvidencePhotoCategory::GeneralOrder => 'Order',
            EvidencePhotoCategory::IntakeCondition => 'Intake',
            EvidencePhotoCategory::KnifeDetail => 'Detail',
            EvidencePhotoCategory::WorkshopDamage => 'Damage',
            EvidencePhotoCategory::CompletedWork => 'Completed',
            EvidencePhotoCategory::QualityCheck => 'Quality',
            EvidencePhotoCategory::Before => 'Before',
            EvidencePhotoCategory::After => 'After',
            default => 'Photo',
        };
    }

    private static function adminCategoryLabel(?EvidencePhotoCategory $category): string
    {
        return match ($category) {
            EvidencePhotoCategory::CollectionProof => 'Collection proof',
            EvidencePhotoCategory::ReturnProof => 'Return proof',
            EvidencePhotoCategory::FailedCollection => 'Failed collection',
            EvidencePhotoCategory::GeneralRouteStop => 'General (stop)',
            EvidencePhotoCategory::GeneralOrder => 'General (order)',
            EvidencePhotoCategory::IntakeCondition => 'Intake condition',
            EvidencePhotoCategory::KnifeDetail => 'Knife detail',
            EvidencePhotoCategory::WorkshopDamage => 'Damage',
            EvidencePhotoCategory::CompletedWork => 'Completed work',
            EvidencePhotoCategory::QualityCheck => 'Quality check',
            EvidencePhotoCategory::Before => 'Before',
            EvidencePhotoCategory::After => 'After',
            default => 'Photo',
        };
    }
}
