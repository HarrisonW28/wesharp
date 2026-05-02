<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Marketing-safe subscription plan fields (active + show_on_public_site only).
 *
 * @mixin SubscriptionPlan
 */
final class PublicSubscriptionPlanResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $highlights = is_array($this->public_highlights) ? $this->public_highlights : [];
        $highlights = array_values(array_filter(array_map(
            static fn (mixed $line): ?string => is_string($line) ? trim($line) : null,
            $highlights
        )));

        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'is_active' => (bool) $this->is_active,
            'description' => $this->description,
            'billing_interval' => $this->billing_interval?->value,
            'price_amount_minor' => (int) $this->price_amount_minor,
            'currency' => (string) $this->currency,
            'included_collections' => $this->included_collections,
            'included_knife_allowance' => $this->included_knife_allowance,
            'overage_price_amount_minor' => $this->overage_price_amount_minor,
            'sort_order' => (int) $this->sort_order,
            'recommended' => (bool) $this->recommended,
            'public_highlights' => $highlights,
            'public_cta_label' => $this->public_cta_label !== null && trim((string) $this->public_cta_label) !== ''
                ? trim((string) $this->public_cta_label)
                : null,
        ];
    }
}
