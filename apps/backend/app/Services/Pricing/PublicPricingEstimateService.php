<?php

declare(strict_types=1);

namespace App\Services\Pricing;

use App\Enums\PricingRuleKind;
use App\Enums\ServiceType;
use App\Http\Resources\PublicSubscriptionPlanResource;
use App\Models\PricingRule;
use App\Models\SubscriptionPlan;
use App\Support\Subscriptions\PublicSubscriptionPlanCatalog;
use Illuminate\Support\Facades\Schema;

/**
 * Marketing-safe pricing hints using the same active {@see PricingRule} rows and
 * public subscription catalogue as ops configure (no parallel price tables).
 */
final class PublicPricingEstimateService
{
    public function __construct(
        private readonly PricingRuleResolver $rules,
    ) {}

    /**
     * @param  array{
     *     knife_count: int,
     *     postcode: ?string,
     *     programme_mode: 'pay_as_you_go'|'subscription',
     *     service_type: ServiceType,
     *     visit_pattern: 'single'|'regular',
     *     customer_kind: 'home'|'business',
     * }  $input
     * @return array<string, mixed>
     */
    public function estimate(array $input): array
    {
        $knives = max(1, (int) $input['knife_count']);
        $postcodeRaw = isset($input['postcode']) ? trim((string) $input['postcode']) : '';
        $normalized = $postcodeRaw !== '' ? strtoupper(preg_replace('/\s+/', '', $postcodeRaw) ?? '') : null;
        if ($normalized === '') {
            $normalized = null;
        }

        $serviceType = $input['service_type'];
        $programme = $input['programme_mode'];
        $visit = $input['visit_pattern'];

        $disclaimer = 'Indicative estimate only — final pricing is agreed after we inspect your blades on site or confirm your programme.';

        if ($programme === 'subscription') {
            return array_merge([
                'programme_mode' => 'subscription',
                'disclaimer' => $disclaimer,
                'visit_pattern' => $visit,
                'customer_kind' => $input['customer_kind'],
            ], $this->subscriptionEstimate($knives));
        }

        return array_merge([
            'programme_mode' => 'pay_as_you_go',
            'disclaimer' => $disclaimer,
            'visit_pattern' => $visit,
            'customer_kind' => $input['customer_kind'],
        ], $this->payAsYouGoEstimate($knives, $serviceType, $normalized, $visit));
    }

    /** @return array<string, mixed> */
    private function subscriptionEstimate(int $knives): array
    {
        if (! Schema::hasColumn('subscription_plans', 'show_on_public_site')) {
            return [
                'estimate_title' => 'Subscription programme',
                'amount_pence' => null,
                'currency' => 'GBP',
                'suggested_package_label' => null,
                'pricing_rule_name' => null,
                'rule_kind' => null,
                'subscription_plan' => null,
                'overage_note' => null,
                'visit_note' => 'Use Book a collection to tell us about your kitchen — we’ll confirm the right plan.',
            ];
        }

        $plans = PublicSubscriptionPlanCatalog::marketedPlans();

        if ($plans->isEmpty()) {
            return [
                'estimate_title' => 'Subscription programme',
                'amount_pence' => null,
                'currency' => 'GBP',
                'suggested_package_label' => null,
                'pricing_rule_name' => null,
                'rule_kind' => null,
                'subscription_plan' => null,
                'overage_note' => null,
                'visit_note' => 'We’ll tailor a programme when you enquire — no catalogue price is shown yet.',
            ];
        }

        /** @var SubscriptionPlan|null $best */
        $best = null;
        $bestAllowance = PHP_INT_MAX;

        foreach ($plans as $plan) {
            $allowance = (int) ($plan->included_knife_allowance ?? 0);
            if ($allowance >= $knives && $allowance < $bestAllowance) {
                $best = $plan;
                $bestAllowance = $allowance;
            }
        }

        if ($best === null) {
            /** @var SubscriptionPlan $best */
            $best = $plans->sortByDesc(fn (SubscriptionPlan $p): int => (int) ($p->included_knife_allowance ?? 0))->first();
        }

        $base = (int) $best->price_amount_minor;
        $allowance = (int) ($best->included_knife_allowance ?? 0);
        $overageRate = (int) ($best->overage_price_amount_minor ?? 0);
        $overageBlades = max(0, $knives - $allowance);
        $overagePence = ($overageBlades > 0 && $overageRate > 0) ? $overageBlades * $overageRate : 0;
        $total = $base + $overagePence;

        $overageNote = null;
        if ($overageBlades > 0 && $overageRate > 0) {
            $overageNote = sprintf(
                '%d knife%s beyond the %d-knife allowance × %s each.',
                $overageBlades,
                $overageBlades === 1 ? '' : 's',
                $allowance,
                $this->minorToGbpPhrase($overageRate)
            );
        } elseif ($overageBlades > 0) {
            $overageNote = sprintf(
                '%d knife%s beyond the included allowance — overage is quoted when we confirm your account.',
                $overageBlades,
                $overageBlades === 1 ? '' : 's'
            );
        }

        $resource = new PublicSubscriptionPlanResource($best);
        /** @var array<string, mixed> $planPayload */
        $planPayload = $resource->toArray(request());

        return [
            'estimate_title' => 'Estimated programme cost (one billing period)',
            'amount_pence' => $total,
            'currency' => (string) $best->currency,
            'suggested_package_label' => (string) $best->name,
            'pricing_rule_name' => null,
            'rule_kind' => null,
            'subscription_plan' => $planPayload,
            'overage_note' => $overageNote,
            'visit_note' => $best->billing_interval !== null
                ? 'Billing cycle: '.$best->billing_interval->value.'.'
                : null,
        ];
    }

    /**
     * @param  non-empty-string|null  $normalizedPostcode
     * @return array<string, mixed>
     */
    private function payAsYouGoEstimate(int $knives, ServiceType $serviceType, ?string $normalizedPostcode, string $visit): array
    {
        $rule = $this->rules->resolveActiveRuleForServiceTypeAndPostcode($serviceType, $normalizedPostcode);

        if ($rule === null) {
            return [
                'estimate_title' => 'Pay-as-you-go visit',
                'amount_pence' => null,
                'currency' => 'GBP',
                'suggested_package_label' => $this->suggestVisitLabel($knives),
                'pricing_rule_name' => null,
                'rule_kind' => null,
                'subscription_plan' => null,
                'overage_note' => null,
                'visit_note' => $normalizedPostcode === null
                    ? 'Add your postcode for an estimate tied to your area — or use Book a collection for a firm quote.'
                    : 'No active price rule matched this postcode and service type — we’ll quote when you enquire.',
            ];
        }

        $kind = PricingRuleKind::tryFrom((string) $rule->rule_kind);
        $amountPence = null;
        if ($kind === PricingRuleKind::PerKnife) {
            $minUnits = (int) ($rule->constraints['minimum_units'] ?? 1);
            $units = max($knives, $minUnits);
            $unit = (int) ($rule->amount_pence ?? 0);
            $amountPence = $units * $unit;
        } elseif ($kind === PricingRuleKind::FlatVisit) {
            $amountPence = (int) ($rule->amount_pence ?? 0);
        }

        $visitNote = null;
        if ($visit === 'regular') {
            $visitNote = 'For kitchens we visit often, a subscription-style programme usually works out simpler than repeated one-off estimates — try the subscription option above.';
        }

        $onsiteNote = null;
        if ($serviceType === ServiceType::Onsite && $kind === PricingRuleKind::FlatVisit) {
            $onsiteNote = 'This reflects the visit / bench rate — per-item sharpening may be added on the quote.';
        }

        return [
            'estimate_title' => $serviceType === ServiceType::Collection
                ? 'Estimated one-off collection (workshop pricing)'
                : 'Estimated on-site visit',
            'amount_pence' => $amountPence,
            'currency' => 'GBP',
            'suggested_package_label' => $this->suggestVisitLabel($knives),
            'pricing_rule_name' => (string) $rule->name,
            'rule_kind' => $rule->rule_kind,
            'subscription_plan' => null,
            'overage_note' => $onsiteNote,
            'visit_note' => $visitNote,
        ];
    }

    private function suggestVisitLabel(int $knives): string
    {
        if ($knives <= 5) {
            return 'Smaller set (home-starter scale)';
        }
        if ($knives <= 10) {
            return 'Mid-size kitchen / refresh scale';
        }
        if ($knives <= 15) {
            return 'Busy line / chef-pack scale';
        }

        return 'Larger operation — bespoke schedule';
    }

    private function minorToGbpPhrase(int $minor): string
    {
        $pounds = $minor / 100;

        return '£'.number_format($pounds, 2, '.', '');
    }
}
