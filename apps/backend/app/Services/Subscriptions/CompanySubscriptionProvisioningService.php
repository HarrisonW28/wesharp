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
        return $this->createSubscriptionWithSchedule(
            $company,
            $plan,
            $initialStatus,
            now(),
            null,
            $billingContactId,
            null,
            $notes,
            $allowInactivePlan,
        );
    }

    /**
     * Create an active subscription with explicit start/renewal and optional price snapshot override.
     */
    public function assignActive(
        Company $company,
        SubscriptionPlan $plan,
        CarbonInterface $startsAt,
        ?CarbonInterface $renewsAt,
        ?string $billingContactId,
        ?int $priceAmountMinorSnapshot,
        ?string $notes,
        bool $allowInactivePlan = false,
    ): CompanySubscription {
        $this->assertPlanAssignable($plan, $allowInactivePlan);
        $this->assertBillingContact($company, $billingContactId);

        if ($company->subscription()->exists()) {
            throw ValidationException::withMessages([
                'status' => 'This company already has an active subscription. Cancel it or change plan instead.',
            ]);
        }

        $snapshot = $priceAmountMinorSnapshot ?? (int) $plan->price_amount_minor;
        $renews = $renewsAt ?? $this->defaultRenewsAt($plan, $startsAt);

        return $this->persistNewSubscription(
            $company,
            $plan,
            SubscriptionStatus::Active,
            $startsAt,
            $renews,
            null,
            $billingContactId,
            $snapshot,
            $notes,
        );
    }

    /**
     * Cancel the active subscription and create a new active row on the given plan (history preserved).
     *
     * @return array{0: CompanySubscription, 1: CompanySubscription} Prior cancelled row, new active row.
     */
    public function changeActivePlan(
        Company $company,
        SubscriptionPlan $newPlan,
        CarbonInterface $effectiveStartsAt,
        ?CarbonInterface $renewsAt,
        ?string $billingContactId,
        ?int $priceAmountMinorSnapshot,
        ?string $additionalNotes,
        bool $allowInactivePlan = false,
    ): array {
        $this->assertPlanAssignable($newPlan, $allowInactivePlan);
        $this->assertBillingContact($company, $billingContactId);

        $active = $company->subscription()->first();
        if (! $active instanceof CompanySubscription) {
            throw ValidationException::withMessages([
                'company_id' => 'This company has no active subscription to change.',
            ]);
        }

        $active->loadMissing('plan');

        return DB::transaction(function () use (
            $company,
            $active,
            $newPlan,
            $effectiveStartsAt,
            $renewsAt,
            $billingContactId,
            $priceAmountMinorSnapshot,
            $additionalNotes,
        ): array {
            $cancelNote = $additionalNotes !== null && $additionalNotes !== ''
                ? $this->appendNote($active->notes, 'Plan change: '.$additionalNotes)
                : $this->appendNote($active->notes, 'Plan change — superseded.');

            $active->update([
                'status' => SubscriptionStatus::Cancelled,
                'cancelled_at' => $effectiveStartsAt->copy()->startOfDay(),
                'renews_at' => null,
                'notes' => $cancelNote,
            ]);

            $snapshot = $priceAmountMinorSnapshot ?? (int) $newPlan->price_amount_minor;
            $renews = $renewsAt ?? $this->defaultRenewsAt($newPlan, $effectiveStartsAt);
            $billingId = $billingContactId ?? $active->billing_contact_id;

            try {
                $created = CompanySubscription::query()->create([
                    'company_id' => $company->id,
                    'subscription_plan_id' => $newPlan->id,
                    'status' => SubscriptionStatus::Active,
                    'starts_at' => $effectiveStartsAt->toDateString(),
                    'renews_at' => $renews->toDateString(),
                    'cancelled_at' => null,
                    'billing_contact_id' => $billingId,
                    'price_amount_minor_snapshot' => $snapshot,
                    'currency' => (string) $newPlan->currency,
                    'notes' => $additionalNotes,
                ]);
            } catch (QueryException $e) {
                if ($this->isDuplicateActiveSubscription($e)) {
                    throw ValidationException::withMessages([
                        'status' => 'Could not activate the new plan — duplicate active subscription.',
                    ]);
                }
                throw $e;
            }

            $active->refresh();
            $created->refresh();

            return [$active, $created];
        });
    }

    public function cancelActive(
        Company $company,
        ?string $cancellationNotes,
        ?CarbonInterface $cancelledAt = null,
    ): CompanySubscription {
        $active = $company->subscription()->first();
        if (! $active instanceof CompanySubscription) {
            throw ValidationException::withMessages([
                'company_id' => 'This company has no active subscription to cancel.',
            ]);
        }

        $when = $cancelledAt ?? now();

        $notes = $cancellationNotes !== null && $cancellationNotes !== ''
            ? $this->appendNote($active->notes, 'Cancellation: '.$cancellationNotes)
            : $active->notes;

        $active->update([
            'status' => SubscriptionStatus::Cancelled,
            'cancelled_at' => $when,
            'renews_at' => null,
            'notes' => $notes,
        ]);

        return $active->refresh();
    }

    /**
     * After cancellation: create a new active subscription, typically from the same plan as the most recent row.
     */
    public function reactivate(
        Company $company,
        SubscriptionPlan $plan,
        CarbonInterface $startsAt,
        ?CarbonInterface $renewsAt,
        ?string $billingContactId,
        ?int $priceAmountMinorSnapshot,
        ?string $notes,
        bool $allowInactivePlan = false,
    ): CompanySubscription {
        $this->assertPlanAssignable($plan, $allowInactivePlan);
        $this->assertBillingContact($company, $billingContactId);

        if ($company->subscription()->exists()) {
            throw ValidationException::withMessages([
                'status' => 'This company already has an active subscription.',
            ]);
        }

        $snapshot = $priceAmountMinorSnapshot ?? (int) $plan->price_amount_minor;
        $renews = $renewsAt ?? $this->defaultRenewsAt($plan, $startsAt);

        return $this->persistNewSubscription(
            $company,
            $plan,
            SubscriptionStatus::Active,
            $startsAt,
            $renews,
            null,
            $billingContactId,
            $snapshot,
            $notes,
        );
    }

    public function updateBillingContact(
        CompanySubscription $subscription,
        Company $company,
        string $billingContactId,
    ): CompanySubscription {
        if ((string) $subscription->company_id !== (string) $company->id) {
            throw ValidationException::withMessages([
                'subscription' => 'Subscription does not belong to this company.',
            ]);
        }

        if ($subscription->status !== SubscriptionStatus::Active) {
            throw ValidationException::withMessages([
                'subscription' => 'Only active subscriptions can have their billing contact updated here.',
            ]);
        }

        $this->assertBillingContact($company, $billingContactId);

        $subscription->update(['billing_contact_id' => $billingContactId]);

        return $subscription->refresh();
    }

    /**
     * Latest subscription row for the company (any status), excluding soft-deleted.
     */
    public function latestSubscriptionRow(Company $company): ?CompanySubscription
    {
        return $company->subscriptions()->with('plan')->first();
    }

    private function createSubscriptionWithSchedule(
        Company $company,
        SubscriptionPlan $plan,
        SubscriptionStatus $initialStatus,
        CarbonInterface $startsAt,
        ?CarbonInterface $renewsAt,
        ?string $billingContactId,
        ?int $priceAmountMinorSnapshot,
        ?string $notes,
        bool $allowInactivePlan,
    ): CompanySubscription {
        $this->assertPlanAssignable($plan, $allowInactivePlan);
        $this->assertBillingContact($company, $billingContactId);

        if ($initialStatus === SubscriptionStatus::Active && $company->subscription()->exists()) {
            throw ValidationException::withMessages([
                'status' => 'This company already has an active subscription. Cancel or expire it before activating another.',
            ]);
        }

        $snapshot = $priceAmountMinorSnapshot ?? (int) $plan->price_amount_minor;
        $renews = $renewsAt;
        if ($renews === null && ! in_array($initialStatus, [SubscriptionStatus::Draft, SubscriptionStatus::Cancelled], true)) {
            $renews = $this->defaultRenewsAt($plan, $startsAt);
        }

        $cancelledAt = $initialStatus === SubscriptionStatus::Cancelled ? $startsAt->copy()->startOfDay() : null;

        return $this->persistNewSubscription(
            $company,
            $plan,
            $initialStatus,
            $startsAt,
            $renews,
            $cancelledAt,
            $billingContactId,
            $snapshot,
            $notes,
        );
    }

    private function persistNewSubscription(
        Company $company,
        SubscriptionPlan $plan,
        SubscriptionStatus $status,
        CarbonInterface $startsAt,
        ?CarbonInterface $renewsAt,
        ?CarbonInterface $cancelledAt,
        ?string $billingContactId,
        int $priceSnapshot,
        ?string $notes,
    ): CompanySubscription {
        return DB::transaction(function () use (
            $company,
            $plan,
            $status,
            $startsAt,
            $renewsAt,
            $cancelledAt,
            $billingContactId,
            $priceSnapshot,
            $notes,
        ): CompanySubscription {
            try {
                $sub = CompanySubscription::query()->create([
                    'company_id' => $company->id,
                    'subscription_plan_id' => $plan->id,
                    'status' => $status,
                    'starts_at' => $startsAt->toDateString(),
                    'renews_at' => $renewsAt?->toDateString(),
                    'cancelled_at' => $cancelledAt,
                    'billing_contact_id' => $billingContactId,
                    'price_amount_minor_snapshot' => $priceSnapshot,
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

    private function assertPlanAssignable(SubscriptionPlan $plan, bool $allowInactivePlan): void
    {
        if (! $allowInactivePlan && (! $plan->is_active || $plan->trashed())) {
            throw ValidationException::withMessages([
                'subscription_plan_id' => 'This plan is not available for new assignments.',
            ]);
        }
    }

    private function assertBillingContact(Company $company, ?string $billingContactId): void
    {
        if ($billingContactId === null) {
            return;
        }

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

    private function appendNote(?string $existing, string $line): string
    {
        $line = trim($line);
        if ($existing === null || trim((string) $existing) === '') {
            return $line;
        }

        return trim((string) $existing)."\n\n".$line;
    }

    public function defaultRenewsAt(SubscriptionPlan $plan, CarbonInterface $from): CarbonInterface
    {
        $d = $from->toImmutable();

        return match ($plan->billing_interval) {
            BillingInterval::Weekly => $d->addWeek(),
            BillingInterval::Monthly => $d->addMonth(),
            BillingInterval::Quarterly => $d->addMonths(3),
            BillingInterval::Yearly => $d->addYear(),
        };
    }

    private function isDuplicateActiveSubscription(QueryException $e): bool
    {
        $msg = $e->getMessage();

        return str_contains($msg, 'company_subscriptions_one_active_per_company')
            || str_contains($msg, 'UNIQUE constraint failed: company_subscriptions.company_id');
    }
}
