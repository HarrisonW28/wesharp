<?php

declare(strict_types=1);

namespace App\Enums;

enum EvidencePhotoCategory: string
{
    case CollectionProof = 'collection_proof';
    case ReturnProof = 'return_proof';
    case FailedCollection = 'failed_collection';
    case GeneralRouteStop = 'general_route_stop';
    case GeneralOrder = 'general_order';

    /** Workshop / order-scoped intake & QC (Sprint 6.4). */
    case IntakeCondition = 'intake_condition';
    case KnifeDetail = 'knife_detail';
    case WorkshopDamage = 'damage';
    case CompletedWork = 'completed_work';
    case QualityCheck = 'quality_check';
    case Before = 'before';
    case After = 'after';

    /**
     * Categories allowed when uploading against an order and/or knife (not route-stop-only).
     *
     * @return list<string>
     */
    public static function orderAndWorkshopValues(): array
    {
        return [
            self::GeneralOrder->value,
            self::IntakeCondition->value,
            self::KnifeDetail->value,
            self::WorkshopDamage->value,
            self::CompletedWork->value,
            self::QualityCheck->value,
            self::Before->value,
            self::After->value,
        ];
    }
}
