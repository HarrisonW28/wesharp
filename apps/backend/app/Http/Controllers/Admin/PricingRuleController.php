<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePricingRuleRequest;
use App\Http\Requests\Admin\UpdatePricingRuleRequest;
use App\Http\Resources\PricingRuleResource;
use App\Models\PricingRule;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PricingRuleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', PricingRule::class);

        $q = PricingRule::query()->orderByDesc('priority')->orderBy('name');
        if (filter_var($request->query('active_only'), FILTER_VALIDATE_BOOL)) {
            $q->where('active', true);
        }

        $items = $q->limit(500)->get();

        return ApiResponses::success([
            'items' => PricingRuleResource::collection($items),
        ]);
    }

    public function store(StorePricingRuleRequest $request): JsonResponse
    {
        $this->authorize('create', PricingRule::class);

        $v = $request->validated();
        $kind = $v['rule_kind'];
        $rule = PricingRule::query()->create([
            'service_area_id' => $v['service_area_id'] ?? null,
            'name' => (string) $v['name'],
            'service_type' => $v['service_type'] ?? null,
            'rule_kind' => $kind instanceof \BackedEnum ? $kind->value : (string) $kind,
            'priority' => (int) ($v['priority'] ?? 0),
            'amount_pence' => isset($v['amount_pence']) ? (int) $v['amount_pence'] : null,
            'constraints' => $v['constraints'] ?? null,
            'active' => (bool) ($v['active'] ?? true),
        ]);

        AuditRecorder::record($request->user(), $rule, 'pricing_rule.created', [
            'name' => $rule->name,
            'rule_kind' => $rule->rule_kind,
        ], $request);

        return ApiResponses::success(['rule' => PricingRuleResource::make($rule)], 201);
    }

    public function update(UpdatePricingRuleRequest $request, PricingRule $pricingRule): JsonResponse
    {
        $this->authorize('update', $pricingRule);

        $v = $request->validated();
        if ($v === []) {
            return ApiResponses::success(['rule' => PricingRuleResource::make($pricingRule)]);
        }

        $before = $pricingRule->only(array_keys($v));

        $patch = $v;
        if (isset($patch['rule_kind']) && $patch['rule_kind'] instanceof \BackedEnum) {
            $patch['rule_kind'] = $patch['rule_kind']->value;
        }

        $pricingRule->fill($patch);
        $pricingRule->save();

        AuditRecorder::record($request->user(), $pricingRule, 'pricing_rule.updated', [
            'before' => $before,
            'after' => $pricingRule->only(array_keys($patch)),
        ], $request);

        return ApiResponses::success(['rule' => PricingRuleResource::make($pricingRule->fresh())]);
    }
}
