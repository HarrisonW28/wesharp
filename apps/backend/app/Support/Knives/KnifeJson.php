<?php

namespace App\Support\Knives;

use App\Models\AuditLog;
use App\Models\Knife;

final class KnifeJson
{
    /** @return array<string, mixed> */
    public static function summary(Knife $knife): array
    {
        return [
            'id' => (string) $knife->id,
            'tag_id' => $knife->tag_id,
            'label' => $knife->label,
            'knife_type' => $knife->knife_type,
            'brand' => $knife->brand,
            'status' => $knife->knife_status?->value,
            'company_id' => (string) $knife->company_id,
            'company_name' => $knife->relationLoaded('company') && $knife->company !== null ? $knife->company->name : null,
            'order_id' => $knife->order_id !== null ? (string) $knife->order_id : null,
            'booking_id' => $knife->booking_id !== null ? (string) $knife->booking_id : null,
            'updated_at' => $knife->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(Knife $knife): array
    {
        $knife->loadMissing([
            'company:id,name,city',
            'booking:id,scheduled_date,booking_status',
            'order:id,order_status,knife_count,price_per_knife_pence',
            'photos' => fn ($q) => $q->orderBy('sort_order')->with([
                'uploadedFile:id,disk,mime_type,original_filename,byte_size,created_at',
                'uploadedBy:id,name',
            ]),
            'sharpenedBy:id,name',
            'qualityCheckedBy:id,name',
            'returnedBy:id,name',
            'damageReports' => fn ($q) => $q->latest()->limit(25),
        ]);

        return [
            'id' => (string) $knife->id,
            'tag_id' => $knife->tag_id,
            'knife_type' => $knife->knife_type,
            'brand' => $knife->brand,
            'description' => $knife->description,
            'condition_before' => $knife->condition_before,
            'damage_notes' => $knife->damage_notes,
            'notes' => $knife->notes,
            'label' => $knife->label,
            'status' => $knife->knife_status?->value,
            'position' => $knife->position,
            'company' => [
                'id' => (string) $knife->company_id,
                'name' => $knife->company?->name,
                'city' => $knife->company?->city,
            ],
            'booking_id' => $knife->booking_id !== null ? (string) $knife->booking_id : null,
            'order_id' => $knife->order_id !== null ? (string) $knife->order_id : null,
            'order_summary' => $knife->order !== null ? [
                'id' => (string) $knife->order->id,
                'status' => $knife->order->order_status?->value,
            ] : null,
            'sharpened_by' => $knife->sharpenedBy ? ['id' => (string) $knife->sharpened_by_user_id, 'name' => $knife->sharpenedBy->name] : null,
            'quality_checked_by' => $knife->qualityCheckedBy ? ['id' => (string) $knife->quality_checked_by_user_id, 'name' => $knife->qualityCheckedBy->name] : null,
            'returned_by' => $knife->returnedBy ? ['id' => (string) $knife->returned_by_user_id, 'name' => $knife->returnedBy->name] : null,
            'damage_reports' => $knife->damageReports->map(fn ($d) => [
                'id' => (string) $d->id,
                'details' => $d->details,
                'severity' => $d->severity,
                'created_at' => $d->created_at?->toIso8601String(),
            ])->values()->all(),
            'photos' => $knife->relationLoaded('photos') ? $knife->photos->map(fn ($p): array => [
                'id' => (string) $p->id,
                'caption' => $p->caption,
                'photo_kind' => $p->photo_kind ?? 'general',
                'sort_order' => $p->sort_order,
                'order_id' => $p->order_id !== null ? (string) $p->order_id : null,
                'created_at' => $p->created_at?->toIso8601String(),
                'uploaded_by' => $p->relationLoaded('uploadedBy') && $p->uploadedBy !== null ? [
                    'id' => (string) $p->uploadedBy->id,
                    'name' => $p->uploadedBy->name,
                ] : null,
                'file' => $p->uploadedFile !== null ? [
                    'id' => (string) $p->uploadedFile->id,
                    'mime_type' => $p->uploadedFile->mime_type,
                    'original_filename' => $p->uploadedFile->original_filename,
                    'byte_size' => (int) $p->uploadedFile->byte_size,
                    'created_at' => $p->uploadedFile->created_at?->toIso8601String(),
                ] : null,
                'content_api_path' => '/api/admin/knife-photos/'.(string) $p->id.'/file',
            ])->values()->all() : [],
            'timeline' => self::timeline($knife),
            'created_at' => $knife->created_at?->toIso8601String(),
            'updated_at' => $knife->updated_at?->toIso8601String(),
        ];
    }

    /** Audit trail for status changes (+ related actions). */
    /** @return list<array<string, mixed>> */
    public static function timeline(Knife $knife): array
    {
        return AuditLog::query()
            ->where('auditable_type', Knife::class)
            /** @phpstan-ignore-next-line */
            ->where('auditable_id', $knife->id)
            ->orderByDesc('created_at')
            ->limit(200)
            ->with('actor:id,name')
            ->get()
            ->map(fn (AuditLog $log): array => [
                'action' => $log->action,
                'payload' => $log->payload ?? [],
                'actor' => $log->actor?->only(['id', 'name']),
                'created_at' => $log->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }
}
