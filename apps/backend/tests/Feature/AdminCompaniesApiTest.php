<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminCompaniesApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_index_returns_paginated_companies_for_internal_user(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $response = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/companies');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'items' => [],
                ],
                'meta' => ['pagination'],
            ]);

        self::assertGreaterThan(0, Company::query()->count());
    }

    public function test_show_company_returns_nested_collections(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();

        $response = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/companies/'.$company->id);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'overview',
                    'finance_intelligence',
                    'subscription',
                    'users',
                    'contacts',
                    'locations',
                    'bookings',
                    'orders',
                    'knives',
                    'invoices',
                    'notes',
                ],
            ]);
    }

    public function test_route_manager_company_detail_has_null_finance_intelligence(): void
    {
        $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)
            ->getJson('/api/admin/companies/'.$company->id)
            ->assertOk()
            ->assertJsonPath('data.finance_intelligence', null);
    }
}
