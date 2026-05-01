<?php

declare(strict_types=1);

namespace App\Services\Subscriptions;

use App\Enums\BillingInterval;
use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Contact;
use App\Models\SubscriptionPlan;
use Carbon\CarbonInterface;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Assigns and updates company subscriptions with catalogue rules (active plan uniqueness, inactive plans, snapshots).
 */
final class CompanySubscriptionProvisioningService
{
    public function createSubscription(
        Company $company,
        SubscriptionPlan $plan,
        SubscriptionStatus $initialStatus,
        ?string $billingContactId = null,
        ?string $notes = null,
        bool $allowInactivePlan = false,
    ): CompanySubscription {
        if (! $allowInactivePlan && (! $plan->is_active || $plan->trashed())) {
            throw ValidationException::withMessages([
                'subscription_plan_id' => 'This plan is not available for new assignments.',
            ]);
        }

        if ($billingContactId !== null) {
            $contact = Contact::query()
                ->where('id', $billingContactId)
                ->where('company_id', $company->id)
                ->whereNull('archived_at')
                ->first();
            if ($contact === null) {
                throw ValidationException::withMessages([
                    'billing_contact_id' => 'Billing contact must be an active contact on this company.',
                ]);
            }
        }

        if ($initialStatus === SubscriptionStatus::Active && $company->subscription()->exists()) {
            throw ValidationException::withMessages([
                'status' => 'This company already has an active subscription. Cancel or expire it before activating another.',
            ]);
        }

        $now = now();

        return DB::transaction(function () use ($company, $plan, $initialStatus, $billingContactId, $notes, $now): CompanySubscription {
            try {
                $sub = CompanySubscription::query()->create([
                    'company_id' => $company->id,
                    'subscription_plan_id' => $plan->id,
                    'status' => $initialStatus,
                    'starts_at' => $now->toDateString(),
                    'renews_at' => in_array($initialStatus, [SubscriptionStatus::Draft, SubscriptionStatus::Cancelled], true)
                        ? null
                        : $this->defaultRenewsAt($plan, $now),
                    'cancelled_at' => $initialStatus === SubscriptionStatus::Cancelled ? $now : null,
                    'billing_contact_id' => $billingContactId,
                    'price_amount_minor_snapshot' => (int) $plan->price_amount_minor,
                    'currency' => (string) $plan->currency,
                    'notes' => $notes,
                ]);
            } catch (QueryException $e) {
                if ($this->isDuplicateActiveSubscription($e)) {
                    throw ValidationException::withMessages([
                        'status' => 'This company already has an active subscription.',
                    ]);
                }
                throw $e;
            }

            return $sub;
        });
    }

    private function defaultRenewsAt(SubscriptionPlan $plan, CarbonInterface $from): string
    {
        $d = $from->toImmutable();

        $end = match ($plan->billing_interval) {
            BillingInterval::Weekly => $d->addWeek(),
            BillingInterval::Monthly => $d->addMonth(),
            BillingInterval::Quarterly => $d->addMonths(3),
            BillingInterval::Yearly => $d->addYear(),
        };

        return $end->toDateString();
    }

    private function isDuplicateActiveSubscription(QueryException $e): bool
    {
        $msg = $e->getMessage();

        return str_contains($msg, 'company_subscriptions_one_active_per_company')
            || str_contains($msg, 'UNIQUE constraint failed: company_subscriptions.company_id');
    }
}
