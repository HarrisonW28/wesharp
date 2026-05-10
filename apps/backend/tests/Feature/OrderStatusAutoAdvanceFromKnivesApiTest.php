<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\KnifeStatus;
use App\Enums\OrderStatus;
use App\Models\AuditLog;
use App\Models\Knife;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class OrderStatusAutoAdvanceFromKnivesApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return callable(): array<string, string> */
    private function opsHeaders(): callable
    {
        $this->seed(WeSharpDemoSeeder::class);
        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        return static fn (): array => ['X-WeSharp-Test-User-Id' => (string) $ops->id];
    }

    public function test_when_all_knives_reach_inspected_order_advances_received_to_inspection(): void
    {
        $h = $this->opsHeaders();

        $order = Order::factory()->create([
            'order_status' => OrderStatus::Received,
        ]);

        $k1 = Knife::factory()->create([
            'company_id' => $order->company_id,
            'order_id' => $order->id,
            'knife_status' => KnifeStatus::Received,
        ]);
        $k2 = Knife::factory()->create([
            'company_id' => $order->company_id,
            'order_id' => $order->id,
            'knife_status' => KnifeStatus::Received,
        ]);

        $this->withHeaders($h())->postJson('/api/admin/knives/'.$k1->id.'/transition', [
            'target_status' => KnifeStatus::Inspected->value,
        ])->assertOk();

        $order->refresh();
        self::assertSame(OrderStatus::Received, $order->order_status);

        $this->withHeaders($h())->postJson('/api/admin/knives/'.$k2->id.'/transition', [
            'target_status' => KnifeStatus::Inspected->value,
        ])->assertOk();

        $order->refresh();
        self::assertSame(OrderStatus::Inspection, $order->order_status);

        self::assertTrue(
            AuditLog::query()
                ->where('auditable_type', Order::class)
                ->where('auditable_id', $order->id)
                ->where('action', 'order.status_changed')
                ->whereJsonContains('payload->to', OrderStatus::Inspection->value)
                ->exists()
        );
    }

    public function test_issue_reported_knife_blocks_auto_advance(): void
    {
        $h = $this->opsHeaders();

        $order = Order::factory()->create([
            'order_status' => OrderStatus::Received,
        ]);

        Knife::factory()->create([
            'company_id' => $order->company_id,
            'order_id' => $order->id,
            'knife_status' => KnifeStatus::IssueReported,
        ]);
        $k2 = Knife::factory()->create([
            'company_id' => $order->company_id,
            'order_id' => $order->id,
            'knife_status' => KnifeStatus::Received,
        ]);

        $this->withHeaders($h())->postJson('/api/admin/knives/'.$k2->id.'/transition', [
            'target_status' => KnifeStatus::Inspected->value,
        ])->assertOk();

        $order->refresh();
        self::assertSame(OrderStatus::Received, $order->order_status);
    }
}
