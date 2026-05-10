<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CostAllocationMethod;
use App\Enums\CostAllocationTargetType;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CostAllocation;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CostAllocationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_can_create_allocation_and_list_ledger(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();

        $create = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/cost-allocations', [
                'target_type' => CostAllocationTargetType::Company->value,
                'target_id' => (string) $company->id,
                'amount_pence' => 12_500,
                'allocation_method' => CostAllocationMethod::DirectManual->value,
                'notes' => 'QA petrol allocation',
            ]);

        $create->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.item.amount_pence', 12_500);

        self::assertSame(1, CostAllocation::query()->count());

        $ledger = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/cost-allocations');

        $ledger->assertOk();
        self::assertCount(1, $ledger->json('data.items'));

        $filtered = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/cost-allocations?company_id='.(string) $company->id);

        $filtered->assertOk();
        self::assertCount(1, $filtered->json('data.items'));

        self::assertTrue(AuditLog::query()->where('action', 'cost_allocation.created')->exists());
    }

    public function test_allocation_to_order_rolls_into_company_filter(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $order = Order::factory()->create(['company_id' => $company->id, 'booking_id' => $booking->id]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/cost-allocations', [
                'target_type' => CostAllocationTargetType::Order->value,
                'target_id' => (string) $order->id,
                'amount_pence' => 3000,
                'allocation_method' => CostAllocationMethod::PerOrder->value,
            ])
            ->assertCreated();

        $filtered = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/cost-allocations?company_id='.(string) $company->id);

        $filtered->assertOk();
        self::assertCount(1, $filtered->json('data.items'));
    }

    public function test_developer_can_list_but_not_create_allocations(): void
    {
        $developer = User::factory()->create(['role' => UserRole::Developer]);
        $company = Company::factory()->create();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->getJson('/api/admin/cost-allocations')
            ->assertOk();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->postJson('/api/admin/cost-allocations', [
                'target_type' => CostAllocationTargetType::Company->value,
                'target_id' => (string) $company->id,
                'amount_pence' => 100,
                'allocation_method' => CostAllocationMethod::DirectManual->value,
            ])
            ->assertForbidden();
    }

    public function test_invalid_target_id_returns_validation_error(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/cost-allocations', [
                'target_type' => CostAllocationTargetType::Company->value,
                'target_id' => '00000000-0000-4000-8000-000000000099',
                'amount_pence' => 100,
                'allocation_method' => CostAllocationMethod::DirectManual->value,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('error.code', 'validation_error')
            ->assertJsonStructure(['error' => ['errors' => ['target_id']]]);
    }
}
