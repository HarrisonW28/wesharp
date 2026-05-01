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
}
