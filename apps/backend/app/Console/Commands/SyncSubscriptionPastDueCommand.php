<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Subscriptions\SubscriptionBillingPeriodService;
use Illuminate\Console\Command;

/**
 * Marks active subscriptions whose renewal date is before today as past_due (internal billing state).
 */
final class SyncSubscriptionPastDueCommand extends Command
{
    protected $signature = 'subscriptions:sync-past-due';

    protected $description = 'Set subscription status to past_due when renews_at is before today (active → past_due).';

    public function handle(SubscriptionBillingPeriodService $periods): int
    {
        $n = $periods->markPastDueWhereRenewalElapsed();
        $this->info("Updated {$n} subscription row(s) to past_due.");

        return self::SUCCESS;
    }
}
