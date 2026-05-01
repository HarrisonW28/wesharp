<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CompanySubscription;
use App\Support\Money\MoneyFormatting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CompanySubscription */
final class CompanySubscriptionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $snapshot = (int) $this->price_amount_minor_snapshot;

        return [
            'id' => (string) $this->id,
            'company_id' => (string) $this->company_id,
            'subscription_plan_id' => (string) $this->subscription_plan_id,
            'status' => $this->status?->value,
            'starts_at' => $this->starts_at?->toDateString(),
            'renews_at' => $this->renews_at?->toDateString(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'billing_contact_id' => $this->billing_contact_id !== null ? (string) $this->billing_contact_id : null,
            'price_amount_minor_snapshot' => $snapshot,
            'formatted_price_snapshot_gbp' => strtoupper((string) $this->currency) === 'GBP'
                ? MoneyFormatting::formatGbpFromPence($snapshot)
                : null,
            'currency' => (string) $this->currency,
            'notes' => $this->notes,
            'plan' => SubscriptionPlanResource::make($this->whenLoaded('plan')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
