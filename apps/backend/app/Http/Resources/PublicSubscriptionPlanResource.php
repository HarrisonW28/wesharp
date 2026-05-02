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
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'billing_interval' => $this->billing_interval?->value,
            'price_amount_minor' => (int) $this->price_amount_minor,
            'currency' => (string) $this->currency,
            'included_collections' => $this->included_collections,
            'included_knife_allowance' => $this->included_knife_allowance,
            'overage_price_amount_minor' => $this->overage_price_amount_minor,
        ];
    }
}
