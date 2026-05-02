<?php

namespace App\Support\Knives;

use App\Enums\DamageReportStatus;
use App\Enums\EvidencePhotoVisibility;
use App\Enums\InvoiceStatus;
use App\Enums\KnifeServiceKind;
use App\Enums\KnifeStatus;
use App\Models\AuditLog;
use App\Models\DamageReport;
use App\Models\EvidencePhoto;
use App\Models\Knife;
use App\Models\KnifeServiceAssignment;
use App\Support\Audit\AuditLogPresenter;
use App\Support\Evidence\EvidencePhotoJson;
use App\Support\Orders\OrderJson;
use App\Support\Orders\OrderStatusPresentation;

final class KnifeJson
{
    /**
     * @return array<string, mixed>
     */
    public static function detailEagerLoadRelations(): array
    {
        return [
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
            'inspectedBy:id,name',
            'damageReports' => fn ($q) => $q->orderByDesc('created_at')->limit(50)->with('reportedBy:id,name'),
            'serviceAssignments' => fn ($q) => $q->orderByDesc('linked_at')->with([
                'order' => fn ($oq) => $oq->with([
                    'invoices' => fn ($iq) => $iq
                        ->where('invoice_status', '!=', InvoiceStatus::Void->value)
                        ->orderByDesc('issued_on')
                        ->limit(5),
                ]),
            ]),
            'evidencePhotos' => fn ($q) => $q->whereNull('archived_at')->orderByDesc('captured_at')->with('uploadedBy:id,name'),
        ];
    }

    /** Customer portal — no company/order/booking identifiers; inspection + damage are customer-safe only. */
    /** @return array<string, mixed> */
    public static function portalSummary(Knife $knife): array
    {
        $knife->loadMissing([
            'damageReports' => fn ($q) => $q->notArchived()
                ->where('customer_visible', true)
                ->orderByDesc('created_at'),
        ]);

        $out = [
            'tag_id' => $knife->tag_id,
            'label' => $knife->label,
            'knife_type' => $knife->knife_type,
            'brand' => $knife->brand,
            'status' => $knife->knife_status?->value,
            'status_label' => KnifeStatusPresentation::customerLabel($knife->knife_status),
        ];

        if ($knife->inspection_customer_visible) {
            $out['inspection'] = [
                'heading' => 'Workshop inspection',
                'condition' => $knife->inspection_condition,
                'notes' => $knife->inspection_notes,
                'inspected_at' => $knife->inspected_at?->toIso8601String(),
            ];
        }

        $out['damage_reports'] = $knife->damageReports
            ->filter(static fn (DamageReport $d) => $d->archived_at === null
                && $d->status !== DamageReportStatus::Archived)
            ->map(static fn (DamageReport $d): array => [
                'severity' => $d->severity?->value,
                'severity_label' => DamageReportPresentation::customerSeverityLabel($d->severity),
                'description' => $d->customer_description,
                'status' => $d->status === DamageReportStatus::Resolved ? 'resolved' : 'open',
                'status_label' => $d->status === DamageReportStatus::Resolved
                    ? 'Addressed in the workshop'
                    : 'Being reviewed',
                'resolved_at' => $d->resolved_at?->toIso8601String(),
                'photo_placeholder' => null,
            ])
            ->values()
            ->all();

        return $out;
    }

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
            'status_label' => KnifeStatusPresentation::adminLabel($knife->knife_status),
            'allowed_next_statuses' => self::allowedNextKnifeStatuses($knife),
            'company_id' => (string) $knife->company_id,
            'company_name' => $knife->relationLoaded('company') && $knife->company !== null ? $knife->company->name : null,
            'order_id' => $knife->order_id !== null ? (string) $knife->order_id : null,
            'booking_id' => $knife->booking_id !== null ? (string) $knife->booking_id : null,
            'updated_at' => $knife->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return list<array{value: string, label: string, risky: bool}>
     */
    public static function allowedNextFromKnifeStatus(?KnifeStatus $status): array
    {
        $from = $status ?? KnifeStatus::Logged;
        $out = [];
        foreach (KnifeStatusTransitions::nextStatuses($from) as $s) {
            $out[] = [
                'value' => $s->value,
                'label' => KnifeStatusPresentation::adminLabel($s),
                'risky' => in_array($s, [
                    KnifeStatus::Cancelled,
                    KnifeStatus::Returned,
                    KnifeStatus::IssueReported,
                ], true),
            ];
        }

        return $out;
    }

    /**
     * @return list<array{value: string, label: string, risky: bool}>
     */
    public static function allowedNextKnifeStatuses(Knife $knife): array
    {
        return self::allowedNextFromKnifeStatus($knife->knife_status);
    }

    /** @return array<string, mixed> */
    public static function adminDamageReportRow(DamageReport $d): array
    {
        $sev = $d->severity;
        $st = $d->status;

        return [
            'id' => (string) $d->id,
            'order_id' => $d->order_id !== null ? (string) $d->order_id : null,
            'knife_id' => (string) $d->knife_id,
            'description' => $d->details,
            'details' => $d->details,
            'internal_notes' => $d->internal_notes,
            'customer_visible' => (bool) $d->customer_visible,
            'customer_description' => $d->customer_description,
            'severity' => $sev instanceof \BackedEnum ? $sev->value : $sev,
            'status' => $st instanceof \BackedEnum ? $st->value : $st,
            'resolved_at' => $d->resolved_at?->toIso8601String(),
            'archived_at' => $d->archived_at?->toIso8601String(),
            'created_at' => $d->created_at?->toIso8601String(),
            'created_by' => $d->relationLoaded('reportedBy') && $d->reportedBy !== null
                ? ['id' => (string) $d->reported_by_id, 'name' => $d->reportedBy->name]
                : ($d->reported_by_id !== null ? ['id' => (string) $d->reported_by_id, 'name' => null] : null),
            'evidence_photos' => $d->relationLoaded('evidencePhotos')
                ? $d->evidencePhotos
                    ->filter(static fn (EvidencePhoto $p) => $p->archived_at === null)
                    ->map(static fn (EvidencePhoto $p): array => EvidencePhotoJson::adminRow($p))
                    ->values()
                    ->all()
                : [],
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(Knife $knife): array
    {
        $knife->loadMissing(self::detailEagerLoadRelations());

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
            'status_label' => KnifeStatusPresentation::adminLabel($knife->knife_status),
            'allowed_next_statuses' => self::allowedNextKnifeStatuses($knife),
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
            'inspection' => [
                'condition' => $knife->inspection_condition,
                'notes' => $knife->inspection_notes,
                'internal_notes' => $knife->inspection_internal_notes,
                'customer_visible' => (bool) $knife->inspection_customer_visible,
                'inspected_at' => $knife->inspected_at?->toIso8601String(),
                'inspected_by' => $knife->inspectedBy ? [
                    'id' => (string) $knife->inspected_by_user_id,
                    'name' => $knife->inspectedBy->name,
                ] : null,
            ],
            'sharpened_by' => $knife->sharpenedBy ? ['id' => (string) $knife->sharpened_by_user_id, 'name' => $knife->sharpenedBy->name] : null,
            'quality_checked_by' => $knife->qualityCheckedBy ? ['id' => (string) $knife->quality_checked_by_user_id, 'name' => $knife->qualityCheckedBy->name] : null,
            'returned_by' => $knife->returnedBy ? ['id' => (string) $knife->returned_by_user_id, 'name' => $knife->returnedBy->name] : null,
            'damage_reports' => $knife->damageReports->map(fn (DamageReport $d): array => self::adminDamageReportRow($d))->values()->all(),
            'workshop_evidence_photos' => $knife->relationLoaded('evidencePhotos')
                ? $knife->evidencePhotos
                    ->filter(static fn (EvidencePhoto $p) => $p->archived_at === null)
                    ->map(static fn (EvidencePhoto $p): array => EvidencePhotoJson::adminRow($p))
                    ->values()
                    ->all()
                : [],
            'evidence_settings' => OrderJson::adminEvidenceSettings(),
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
            'past_orders' => $knife->serviceAssignments
                ->map(static function (KnifeServiceAssignment $a): ?array {
                    if ($a->order === null) {
                        return null;
                    }

                    return [
                        'order_id' => (string) $a->order->id,
                        'order_status' => $a->order->order_status?->value,
                        'order_status_label' => OrderStatusPresentation::adminLabel($a->order->order_status),
                        'linked_at' => $a->linked_at?->toIso8601String(),
                        'unlinked_at' => $a->unlinked_at?->toIso8601String(),
                        'is_current' => $a->unlinked_at === null,
                    ];
                })
                ->filter()
                ->values()
                ->all(),
            'service_history' => $knife->serviceAssignments
                ->map(fn (KnifeServiceAssignment $a): array => self::adminAssignmentRow($knife, $a))
                ->filter(static fn (array $row): bool => $row !== [])
                ->values()
                ->all(),
            'created_at' => $knife->created_at?->toIso8601String(),
            'updated_at' => $knife->updated_at?->toIso8601String(),
        ];
    }

    /** Full knife detail for the customer portal (company-scoped; safe history only). */
    /** @return array<string, mixed> */
    public static function portalDetail(Knife $knife): array
    {
        $knife->loadMissing([
            'damageReports' => fn ($q) => $q->notArchived()->orderByDesc('created_at'),
            'evidencePhotos' => fn ($q) => $q->whereNull('archived_at')->orderByDesc('captured_at'),
            'serviceAssignments' => fn ($q) => $q->orderByDesc('linked_at')->with([
                'order' => fn ($oq) => $oq->with([
                    'invoices' => fn ($iq) => $iq
                        ->where('invoice_status', '!=', InvoiceStatus::Void->value)
                        ->orderByDesc('issued_on')
                        ->limit(5),
                ]),
            ]),
        ]);

        $summary = self::portalSummary($knife);

        return array_merge(
            [
                'id' => (string) $knife->id,
                'created_at' => $knife->created_at?->toIso8601String(),
                'updated_at' => $knife->updated_at?->toIso8601String(),
            ],
            $summary,
            [
                'service_history' => $knife->serviceAssignments
                    ->map(fn (KnifeServiceAssignment $a): array => self::portalAssignmentRow($knife, $a))
                    ->filter(static fn (array $row): bool => $row !== [])
                    ->values()
                    ->all(),
            ],
        );
    }

    /** @return array<string, mixed> */
    private static function adminAssignmentRow(Knife $knife, KnifeServiceAssignment $assignment): array
    {
        $order = $assignment->order;
        if ($order === null) {
            return [];
        }

        $orderId = (string) $order->id;
        $damages = $knife->damageReports
            ->filter(static fn (DamageReport $d): bool => $d->archived_at === null
                && $d->order_id !== null && (string) $d->order_id === $orderId);
        $evidence = $knife->evidencePhotos
            ->filter(static fn (EvidencePhoto $p): bool => $p->archived_at === null
                && $p->order_id !== null && (string) $p->order_id === $orderId);

        $conditionParts = [];
        foreach ($damages as $d) {
            if (is_string($d->details) && $d->details !== '') {
                $conditionParts[] = $d->details;
            }
        }

        return [
            'id' => (string) $assignment->id,
            'order_id' => $orderId,
            'order_status' => $order->order_status?->value,
            'order_status_label' => OrderStatusPresentation::adminLabel($order->order_status),
            'service_kind' => $assignment->service_kind?->value,
            'service_kind_label' => self::serviceKindAdminLabel($assignment->service_kind),
            'service_date' => $assignment->linked_at?->toIso8601String(),
            'order_completed_at' => $order->completed_at?->toIso8601String(),
            'linked_at' => $assignment->linked_at?->toIso8601String(),
            'unlinked_at' => $assignment->unlinked_at?->toIso8601String(),
            'is_current' => $assignment->unlinked_at === null,
            'condition_summary' => $conditionParts !== [] ? implode('; ', array_slice($conditionParts, 0, 4)) : null,
            'damage_reports' => $damages->map(fn (DamageReport $d): array => self::adminDamageReportRow($d))->values()->all(),
            'invoices' => $order->relationLoaded('invoices')
                ? $order->invoices->map(static fn ($inv): array => [
                    'id' => (string) $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'invoice_status' => $inv->invoice_status?->value,
                    'admin_path' => '/admin/invoices/'.(string) $inv->id,
                ])->values()->all()
                : [],
            'workshop_evidence_photos' => $evidence
                ->map(static fn (EvidencePhoto $p): array => EvidencePhotoJson::adminRow($p))
                ->values()
                ->all(),
        ];
    }

    /** @return array<string, mixed> */
    private static function portalAssignmentRow(Knife $knife, KnifeServiceAssignment $assignment): array
    {
        $order = $assignment->order;
        if ($order === null) {
            return [];
        }

        $orderId = (string) $order->id;
        $damages = $knife->damageReports
            ->filter(static fn (DamageReport $d): bool => $d->archived_at === null
                && $d->customer_visible
                && $d->order_id !== null && (string) $d->order_id === $orderId);
        $evidence = $knife->evidencePhotos
            ->filter(static fn (EvidencePhoto $p): bool => $p->archived_at === null
                && $p->visibility === EvidencePhotoVisibility::CustomerVisible
                && $p->order_id !== null && (string) $p->order_id === $orderId);

        $conditionParts = [];
        foreach ($damages as $d) {
            $line = is_string($d->customer_description) && $d->customer_description !== ''
                ? $d->customer_description
                : null;
            if ($line !== null) {
                $conditionParts[] = $line;
            }
        }

        $invoices = [];
        if ($order->relationLoaded('invoices')) {
            foreach ($order->invoices as $inv) {
                if ($inv->invoice_status === InvoiceStatus::Void) {
                    continue;
                }
                $invoices[] = [
                    'id' => (string) $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'portal_path' => '/account/invoices/'.(string) $inv->id,
                ];
            }
        }

        return [
            'assignment_id' => (string) $assignment->id,
            'service_kind' => $assignment->service_kind?->value,
            'service_kind_label' => self::serviceKindCustomerLabel($assignment->service_kind),
            'service_date' => $assignment->linked_at?->toIso8601String(),
            'order' => [
                'id' => $orderId,
                'status' => $order->order_status?->value,
                'status_label' => OrderStatusPresentation::customerLabel($order->order_status),
            ],
            'is_current' => $assignment->unlinked_at === null,
            'condition_summary' => $conditionParts !== [] ? implode(' ', $conditionParts) : null,
            'photos' => $evidence
                ->map(static fn (EvidencePhoto $p): array => EvidencePhotoJson::portalRow($p, $order))
                ->values()
                ->all(),
            'invoices' => $invoices,
        ];
    }

    private static function serviceKindAdminLabel(?KnifeServiceKind $kind): string
    {
        if ($kind === null) {
            return '—';
        }

        return match ($kind) {
            KnifeServiceKind::Intake => 'New registration',
            KnifeServiceKind::InventoryLink => 'Linked from inventory',
            KnifeServiceKind::Reservice => 'Resharpening / repeat service',
        };
    }

    private static function serviceKindCustomerLabel(?KnifeServiceKind $kind): string
    {
        if ($kind === null) {
            return 'Service';
        }

        return match ($kind) {
            KnifeServiceKind::Intake => 'Workshop service',
            KnifeServiceKind::InventoryLink => 'Workshop service',
            KnifeServiceKind::Reservice => 'Return visit',
        };
    }

    /** Readable one-line label for picks and short lists (route evidence, etc.). */
    public static function briefListingLabel(Knife $knife): string
    {
        $parts = array_values(array_filter(
            [$knife->brand, $knife->knife_type, $knife->label],
            static fn ($p) => is_string($p) && trim($p) !== '',
        ));

        if ($parts !== []) {
            return implode(' · ', $parts);
        }

        if (is_string($knife->tag_id) && trim($knife->tag_id) !== '') {
            return 'Blade '.$knife->tag_id;
        }

        return 'Knife';
    }

    /** Audit trail for status changes (+ related actions). */
    /** @return list<array<string, mixed>> */
    public static function timeline(Knife $knife): array
    {
        $rows = AuditLog::query()
            ->where('auditable_type', Knife::class)
            /** @phpstan-ignore-next-line */
            ->where('auditable_id', $knife->id)
            ->orderByDesc('created_at')
            ->limit(200)
            ->with('actor:id,name,email')
            ->get();

        return AuditLogPresenter::mapTimeline($rows, includeIp: true);
    }
}
