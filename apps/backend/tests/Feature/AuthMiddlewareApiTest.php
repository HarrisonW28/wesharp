<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AuthMiddlewareApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_admin_without_test_user_header_returns_unauthorised(): void
    {
        $this->getJson('/api/admin/companies')->assertUnauthorized();
    }

    public function test_admin_with_unknown_test_user_id_returns_unauthorised(): void
    {
        $this->withHeader('X-WeSharp-Test-User-Id', '999999991')
            ->getJson('/api/admin/companies')
            ->assertUnauthorized();
    }

    public function test_internal_user_can_enter_admin_area(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/companies?per_page=1')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_customer_blocked_from_staff_admin_namespace(): void
    {
        $tenant = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)
            ->getJson('/api/admin/companies')
            ->assertForbidden();
    }

    public function test_internal_user_blocked_from_tenant_namespace(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/account/dashboard')
            ->assertForbidden();
    }
}
