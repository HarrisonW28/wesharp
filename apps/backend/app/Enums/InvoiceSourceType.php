<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * What generated this invoice — used for idempotency and integrations (Sprint 9+).
 */
enum InvoiceSourceType: string
{
    /** Commercial invoice tied to a kitchen / workshop order (MVP default). */
    case Order = 'order';

    /** Recurring subscription charge (Sprint 9 — generation gated). */
    case CompanySubscription = 'company_subscription';
}
