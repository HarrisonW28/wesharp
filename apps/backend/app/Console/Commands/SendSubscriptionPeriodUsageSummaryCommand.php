<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\SubscriptionStatus;
use App\Models\CompanySubscription;
use App\Services\Notifications\SubscriptionEmailService;
use Illuminate\Console\Command;

final class SendSubscriptionPeriodUsageSummaryCommand extends Command
{
    protected $signature = 'subscriptions:send-period-usage-summaries';

    protected $description = 'Queue pre-renewal subscription usage summary emails (from completed orders in the current period).';

    public function handle(SubscriptionEmailService $subscriptionEmails): int
    {
        $days = (int) config('wesharp.subscription_period_summary_days_before_renewal', 1);
        if ($days <= 0) {
            $this->info('Subscription period usage summaries are disabled (subscription_period_summary_days_before_renewal <= 0).');

            return self::SUCCESS;
        }

        $targetYmd = now()->addDays($days)->toDateString();

        $count = 0;

        CompanySubscription::query()
            ->where('status', SubscriptionStatus::Active->value)
            ->whereNotNull('renews_at')
            ->whereDate('renews_at', $targetYmd)
            ->orderBy('id')
            ->chunkById(100, function ($subs) use ($subscriptionEmails, &$count): void {
                foreach ($subs as $sub) {
                    if (! $sub instanceof CompanySubscription) {
                        continue;
                    }
                    $subscriptionEmails->sendPeriodUsageSummary($sub);
                    $count++;
                }
            });

        $this->info("Queued period usage summaries for {$count} subscription(s) (renews in {$days} day(s)).");

        return self::SUCCESS;
    }
}
