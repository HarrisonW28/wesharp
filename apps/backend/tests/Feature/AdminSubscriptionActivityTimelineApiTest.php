<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CompanySubscription;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminSubscriptionActivityTimelineApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_staff_can_load_subscription_audit_timeline(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $sub = CompanySubscription::query()->firstOrFail();
        $companyId = (string) $sub->company_id;

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/companies/'.$companyId.'/subscriptions/'.$sub->id.'/activity')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['items']]);
    }
}
