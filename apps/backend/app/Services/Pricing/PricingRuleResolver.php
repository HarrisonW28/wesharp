<?php

declare(strict_types=1);

namespace App\Services\Pricing;

use App\Enums\PricingRuleKind;
use App\Enums\ServiceType;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Order;
use App\Models\PricingRule;
use App\Models\ServiceArea;
use App\Support\ServiceAreas\ServiceAreaCoverageResolver;
use App\Support\ServiceAreas\UkPostcodeGeocoder;

/**
 * Picks the highest-priority active pricing rule for an order’s booking service type
 * and company location postcode vs service area radius/prefix rules.
 */
final class PricingRuleResolver
{
    public function resolveForOrder(Order $order): ?PricingRule
    {
        $order->loadMissing(['booking', 'company']);
        $company = $order->company;
        if (! $company instanceof Company) {
            return null;
        }

        $serviceType = $order->booking?->service_type;
        $location = $this->defaultLocationForCompany($company);

        $rules = PricingRule::query()
            ->where('active', true)
            ->orderByDesc('priority')
            ->orderByDesc('created_at')
            ->get();

        $norm = $this->normalizedPostcodeFromLocation($location);
        [$lat, $lng] = $this->customerCoordinatesForMatching($norm);

        foreach ($rules as $rule) {
            if (! $rule instanceof PricingRule) {
                continue;
            }
            if ($rule->service_type !== null) {
                if ($serviceType === null || $rule->service_type !== $serviceType) {
                    continue;
                }
            }
            if (! self::ruleMatchesNormalizedPostcode($rule, $norm, $lat, $lng)) {
                continue;
            }

            return $rule;
        }

        return null;
    }

    /** Per-blade list price from a matching {@see PricingRuleKind::PerKnife} rule. */
    public function defaultUnitAmountPenceForOrder(Order $order): ?int
    {
        $rule = $this->resolveForOrder($order);
        if ($rule === null) {
            return null;
        }

        if ($rule->rule_kind !== PricingRuleKind::PerKnife->value) {
            return null;
        }

        return $rule->amount_pence !== null ? (int) $rule->amount_pence : null;
    }

    private function defaultLocationForCompany(Company $company): ?CompanyLocation
    {
        /** @phpstan-ignore-next-line */
        return $company->locations()
            ->whereNull('archived_at')
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->first();
    }

    /**
     * @param  non-empty-string|null  $normalizedPostcode  Uppercase outbound code without spaces (e.g. M11AA).
     */
    public static function ruleMatchesNormalizedPostcode(
        PricingRule $rule,
        ?string $normalizedPostcode,
        ?float $customerLat = null,
        ?float $customerLng = null,
    ): bool {
        if ($rule->service_area_id === null) {
            return true;
        }

        if ($normalizedPostcode === null || $normalizedPostcode === '') {
            return false;
        }

        $area = ServiceArea::query()
            ->where('id', $rule->service_area_id)
            ->where('active', true)
            ->first();

        if (! $area instanceof ServiceArea) {
            return false;
        }

        return ServiceAreaCoverageResolver::postcodeMatchesArea($area, $normalizedPostcode, $customerLat, $customerLng);
    }

    /**
     * First matching active rule for anonymous / marketing estimates (postcode only).
     */
    public function resolveActiveRuleForServiceTypeAndPostcode(ServiceType $serviceType, ?string $normalizedPostcode): ?PricingRule
    {
        $rules = PricingRule::query()
            ->where('active', true)
            ->orderByDesc('priority')
            ->orderByDesc('created_at')
            ->get();

        [$lat, $lng] = $this->customerCoordinatesForMatching($normalizedPostcode);

        foreach ($rules as $rule) {
            if (! $rule instanceof PricingRule) {
                continue;
            }
            if ($rule->service_type !== null && $rule->service_type !== $serviceType) {
                continue;
            }
            if (! self::ruleMatchesNormalizedPostcode($rule, $normalizedPostcode, $lat, $lng)) {
                continue;
            }

            return $rule;
        }

        return null;
    }

    private function normalizedPostcodeFromLocation(?CompanyLocation $location): ?string
    {
        if ($location === null) {
            return null;
        }

        $pc = strtoupper(preg_replace('/\s+/', '', (string) $location->postcode) ?? '');

        return $pc !== '' ? $pc : null;
    }

    /**
     * @param  non-empty-string|null  $normalizedPostcode
     * @return array{0: ?float, 1: ?float}
     */
    private function customerCoordinatesForMatching(?string $normalizedPostcode): array
    {
        if ($normalizedPostcode === null || $normalizedPostcode === '') {
            return [null, null];
        }

        if (! ServiceAreaCoverageResolver::anyActiveAreaUsesRadius()) {
            return [null, null];
        }

        $geo = UkPostcodeGeocoder::lookupOptional($normalizedPostcode);
        if ($geo === null) {
            return [null, null];
        }

        return [$geo['lat'], $geo['lng']];
    }
}
