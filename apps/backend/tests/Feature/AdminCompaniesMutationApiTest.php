<?php

namespace Tests\Feature;

use App\Enums\CompanyStatus;
use App\Models\Company;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminCompaniesMutationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_store_create_and_update_company(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $h = fn () => ['X-WeSharp-Test-User-Id' => (string) $operator->id];

        $create = $this->withHeaders($h())
            ->postJson('/api/admin/companies', [
                'name' => 'PHPUnit Fixture Kitchen',
                'city' => 'Manchester',
                'billing_email' => 'fixture.kitchen@test.wesharp',
            ]);

        $create->assertCreated()
            ->assertJsonPath('success', true);

        $id = $create->json('data.id');
        self::assertNotEmpty($id);

        self::assertDatabaseHas('companies', [
            'id' => $id,
            'name' => 'PHPUnit Fixture Kitchen',
            'city' => 'Manchester',
        ]);

        $update = $this->withHeaders($h())
            ->putJson('/api/admin/companies/'.$id, [
                'name' => 'PHPUnit Fixture Kitchen (HQ)',
                'billing_email' => 'hq.fixture.kitchen@test.wesharp',
            ]);

        $update->assertOk()
            ->assertJsonPath('data.name', 'PHPUnit Fixture Kitchen (HQ)');
    }

    public function test_soft_delete_company(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $company = Company::query()->create([
            'name' => 'Deletable Fixture Co',
            'slug' => 'deletable-fixture-co-'.bin2hex(random_bytes(4)),
            'company_status' => CompanyStatus::Lead,
            'city' => 'Liverpool',
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->delete('/api/admin/companies/'.$company->id)
            ->assertNoContent();

        self::assertSoftDeleted('companies', ['id' => $company->id]);
    }
}
