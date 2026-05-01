<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\KnifeStatus;
use App\Models\AuditLog;
use App\Models\Knife;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminKnifeServiceWorkflowApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{ops: User, h: callable} */
    private function opsHeaders(): array
    {
        $this->seed(WeSharpDemoSeeder::class);
        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $h = static fn (): array => ['X-WeSharp-Test-User-Id' => (string) $ops->id];

        return ['ops' => $ops, 'h' => $h];
    }

    public function test_transition_advances_through_sharpening_and_audits(): void
    {
        ['h' => $h] = $this->opsHeaders();

        $knife = Knife::factory()->create([
            'knife_status' => KnifeStatus::Logged,
        ]);

        $this->withHeaders($h())
            ->postJson('/api/admin/knives/'.$knife->id.'/transition', [
                'target_status' => KnifeStatus::Inspected->value,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', KnifeStatus::Inspected->value);

        $this->withHeaders($h())
            ->postJson('/api/admin/knives/'.$knife->id.'/transition', [
                'target_status' => KnifeStatus::Sharpening->value,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', KnifeStatus::Sharpening->value);

        self::assertTrue(
            AuditLog::query()
                ->where('auditable_type', Knife::class)
                ->where('auditable_id', $knife->id)
                ->where('action', 'knife.status_changed')
                ->exists()
        );
    }

    public function test_invalid_knife_transition_returns_422(): void
    {
        ['h' => $h] = $this->opsHeaders();

        $knife = Knife::factory()->create([
            'knife_status' => KnifeStatus::Logged,
        ]);

        $this->withHeaders($h())
            ->postJson('/api/admin/knives/'.$knife->id.'/transition', [
                'target_status' => KnifeStatus::Sharpened->value,
            ])
            ->assertStatus(422);
    }

    public function test_order_item_line_transition_when_no_knife(): void
    {
        ['h' => $h] = $this->opsHeaders();

        $order = Order::query()->firstOrFail();
        $item = OrderItem::query()->create([
            'order_id' => $order->id,
            'knife_id' => null,
            'description' => 'Aggregate line (no blade row)',
            'quantity' => 1,
            'unit_amount_pence' => 1_000,
        ]);

        $this->withHeaders($h())
            ->postJson('/api/admin/orders/'.$order->id.'/items/'.$item->id.'/transition', [
                'target_status' => KnifeStatus::Received->value,
            ])
            ->assertOk();

        $item->refresh();
        self::assertSame(KnifeStatus::Received, $item->service_status);

        self::assertTrue(
            AuditLog::query()
                ->where('auditable_type', OrderItem::class)
                ->where('auditable_id', $item->id)
                ->where('action', 'order_item.status_changed')
                ->exists()
        );
    }
}
