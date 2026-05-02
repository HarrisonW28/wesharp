<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class WorkQueueApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_customer_cannot_access_work_queue(): void
    {
        $tenant = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)
            ->getJson('/api/admin/work-queue')
            ->assertForbidden();
    }

    public function test_internal_user_receives_work_queue_payload(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/work-queue')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['sections']]);
    }

    public function test_finance_user_sees_invoice_queue_ids_when_present(): void
    {
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/work-queue')
            ->assertOk();

        $sections = $res->json('data.sections');
        $this->assertIsArray($sections);
        $ids = collect($sections)->flatMap(fn (array $s) => collect($s['items'] ?? [])->pluck('id'))->all();
        $this->assertContains('invoices.unpaid', $ids);
    }

    public function test_route_manager_work_queue_omits_finance_only_items(): void
    {
        $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)
            ->getJson('/api/admin/work-queue')
            ->assertOk();

        $sections = $res->json('data.sections');
        $this->assertIsArray($sections);
        $ids = collect($sections)->flatMap(fn (array $s) => collect($s['items'] ?? [])->pluck('id'))->all();
        $this->assertNotContains('invoices.unpaid', $ids);
        $this->assertNotContains('invoices.overdue', $ids);
        $this->assertNotContains('notifications.failed_deliveries', $ids);
        $this->assertNotContains('payments.overdue', $ids);
    }
}
