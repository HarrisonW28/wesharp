<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\SubscriptionStatus;
use App\Models\CompanySubscription;
use App\Services\Notifications\SubscriptionEmailService;
use Illuminate\Console\Command;

final class SendSubscriptionRenewalRemindersCommand extends Command
{
    protected $signature = 'subscriptions:send-renewal-reminders';

    protected $description = 'Queue customer-facing subscription “renewal upcoming” emails (active subscriptions only).';

    public function handle(SubscriptionEmailService $subscriptionEmails): int
    {
        $days = max(1, (int) config('wesharp.subscription_renewal_reminder_days', 7));
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
                    $subscriptionEmails->sendRenewalUpcoming($sub);
                    $count++;
                }
            });

        $this->info("Queued renewal reminders for {$count} subscription(s) (renews in {$days} day(s)).");

        return self::SUCCESS;
    }
}
