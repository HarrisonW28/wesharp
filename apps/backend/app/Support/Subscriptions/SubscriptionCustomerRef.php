<?php

declare(strict_types=1);

namespace App\Support\Subscriptions;

use App\Models\CompanySubscription;

/** Customer-facing reference — never expose raw UUID as the primary label. */
final class SubscriptionCustomerRef
{
    public static function reference(CompanySubscription $subscription): string
    {
        $hex = str_replace('-', '', (string) $subscription->id);

        return 'SUB-'.strtoupper(substr($hex, 0, 8));
    }
}
