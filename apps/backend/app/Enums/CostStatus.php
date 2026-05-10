<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Cost row lifecycle — maps workbook “Status” column where applicable.
 */
enum CostStatus: string
{
    case Purchased = 'purchased';

    case ToOrder = 'to_order';

    case PendingQuote = 'pending_quote';

    case Deferred = 'deferred';

    case Active = 'active';

    case ToArrange = 'to_arrange';

    case Reserve = 'reserve';

    case ToResearch = 'to_research';

    case Cancelled = 'cancelled';

    case Archived = 'archived';

    /**
     * Map Cost Plan spreadsheet status labels (case-insensitive).
     */
    public static function tryFromCostPlanLabel(?string $label): ?self
    {
        if ($label === null) {
            return null;
        }

        $n = strtolower(trim(str_replace(['_', '-'], ' ', $label)));

        return match ($n) {
            'purchased', 'bought' => self::Purchased,
            'to order', 'toorder' => self::ToOrder,
            'pending quote', 'pendingquote' => self::PendingQuote,
            'deferred' => self::Deferred,
            'active' => self::Active,
            'to arrange', 'toarrange' => self::ToArrange,
            'reserve' => self::Reserve,
            'to research', 'toresearch' => self::ToResearch,
            'cancelled', 'canceled' => self::Cancelled,
            'archived' => self::Archived,
            default => null,
        };
    }

    /** Active / on-books recurring commitments for internal finance totals (Sprint 23.3). */
    public function isActiveRecurringCommitmentBucket(): bool
    {
        return match ($this) {
            self::Active, self::Purchased, self::Reserve => true,
            default => false,
        };
    }

    /** Not yet fully arranged — excluded from “committed active” burn until status moves. */
    public function isPendingRecurringCommitmentBucket(): bool
    {
        return match ($this) {
            self::ToOrder, self::PendingQuote, self::ToArrange, self::ToResearch, self::Deferred => true,
            default => false,
        };
    }
}
