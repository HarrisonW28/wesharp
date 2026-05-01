<?php

declare(strict_types=1);

namespace App\Support\Invoices;

use App\Enums\InvoiceStatus;

/**
 * Valid finance transitions for workshop invoices (stored {@see InvoiceStatus}).
 *
 * Note: {@see InvoiceStatus::Overdue} is normally entered from {@see InvoiceStatus::Sent} when past due.
 * Partial settlement is reflected via {@see InvoiceRollup::paymentStatus()} (`partial`), not a stored status.
 */
final readonly class InvoiceStatusTransitions
{
    public static function canSend(InvoiceStatus $from): bool
    {
        return $from === InvoiceStatus::Draft;
    }

    public static function canMarkPaid(InvoiceStatus $from): bool
    {
        return in_array($from, [InvoiceStatus::Draft, InvoiceStatus::Sent, InvoiceStatus::Overdue], true);
    }

    public static function canVoid(InvoiceStatus $from): bool
    {
        return in_array($from, [InvoiceStatus::Draft, InvoiceStatus::Sent, InvoiceStatus::Overdue], true);
    }

    /** Sent / overdue → draft when nothing has been received (undo mistaken send). */
    public static function canReopenDraft(InvoiceStatus $from): bool
    {
        return in_array($from, [InvoiceStatus::Sent, InvoiceStatus::Overdue], true);
    }

    public static function canAutoOverdue(InvoiceStatus $from): bool
    {
        return $from === InvoiceStatus::Sent;
    }

    public static function assertSend(InvoiceStatus $from): void
    {
        if (! self::canSend($from)) {
            abort(422, 'Only draft invoices can be marked sent.');
        }
    }

    public static function assertMarkPaid(InvoiceStatus $from): void
    {
        if (! self::canMarkPaid($from)) {
            abort(422, 'Invoice cannot be marked paid in its current status.');
        }
    }

    public static function assertVoid(InvoiceStatus $from): void
    {
        if (! self::canVoid($from)) {
            abort(422, 'Invoice cannot be voided in its current status.');
        }
    }

    public static function assertReopenDraft(InvoiceStatus $from): void
    {
        if (! self::canReopenDraft($from)) {
            abort(422, 'Only sent or overdue invoices can be reopened as draft, and only when no payments exist.');
        }
    }
}
