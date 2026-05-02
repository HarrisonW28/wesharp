<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\PricingRule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PricingRule
 */
final class PricingRuleResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var PricingRule $r */
        $r = $this->resource;

        return [
            'id' => (string) $r->id,
            'service_area_id' => $r->service_area_id !== null ? (string) $r->service_area_id : null,
            'name' => $r->name,
            'service_type' => $r->service_type?->value,
            'rule_kind' => $r->rule_kind,
            'priority' => (int) $r->priority,
            'amount_pence' => $r->amount_pence !== null ? (int) $r->amount_pence : null,
            'constraints' => $r->constraints,
            'active' => (bool) $r->active,
            'created_at' => $r->created_at?->toIso8601String(),
            'updated_at' => $r->updated_at?->toIso8601String(),
        ];
    }
}
