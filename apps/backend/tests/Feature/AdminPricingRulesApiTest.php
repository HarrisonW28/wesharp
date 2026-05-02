<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PricingRuleKind;
use App\Enums\ServiceType;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\ServiceArea;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminPricingRulesApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_can_list_create_and_update_pricing_rules(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $area = ServiceArea::factory()->create(['postcode_prefix' => 'M', 'active' => true]);

        $list = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/pricing-rules');
        $list->assertOk();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson('/api/admin/pricing-rules', [
            'service_area_id' => $area->id,
            'name' => 'Test per blade',
            'service_type' => ServiceType::Collection->value,
            'rule_kind' => PricingRuleKind::PerKnife->value,
            'priority' => 10,
            'amount_pence' => 999,
            'active' => true,
        ]);
        $res->assertCreated();
        $id = (string) $res->json('data.rule.id');

        $upd = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->putJson('/api/admin/pricing-rules/'.$id, [
            'active' => false,
        ]);
        $upd->assertOk();
        self::assertFalse((bool) $upd->json('data.rule.active'));

        self::assertTrue(AuditLog::query()->where('action', 'pricing_rule.created')->exists());
        self::assertTrue(AuditLog::query()->where('action', 'pricing_rule.updated')->exists());
    }

    public function test_route_manager_cannot_manage_pricing_rules(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);
        $area = ServiceArea::factory()->create();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson('/api/admin/pricing-rules', [
            'name' => 'X',
            'rule_kind' => PricingRuleKind::PerKnife->value,
            'service_area_id' => $area->id,
        ])->assertStatus(403);
    }
}
