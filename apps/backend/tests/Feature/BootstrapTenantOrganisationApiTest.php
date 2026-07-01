<?php

namespace Tests\Feature;

use App\Enums\CompanyStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class BootstrapTenantOrganisationApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function customer_without_company_can_bootstrap_then_is_idempotent_blocked(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::CustomerOwner,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->postJson('/api/v1/account/bootstrap-organisation', [
                'name' => 'Riverside Prep Lab',
                'city' => 'Liverpool',
            ])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.company.name', 'Riverside Prep Lab');

        $user->refresh();
        /** @phpstan-ignore-next-line */
        $this->assertNotNull($user->company_id);
        /** @phpstan-ignore-next-line */
        $this->assertTrue(Company::query()->whereKey($user->company_id)->exists());

        /** @phpstan-ignore-next-line */
        $co = Company::query()->findOrFail($user->company_id);
        /** @phpstan-ignore-next-line */
        $this->assertFalse((bool) $co->is_sole_customer);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->postJson('/api/v1/account/bootstrap-organisation', ['name' => 'Another Org'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'organisation_already_linked');
    }

    #[Test]
    public function bootstrap_attaches_existing_lead_company_by_billing_email(): void
    {
        $existing = Company::factory()->create([
            'name' => 'Prior Enquiry Kitchen',
            'billing_email' => 'owner@prior.example',
            'company_status' => CompanyStatus::Lead,
        ]);

        $user = User::factory()->create([
            'role' => UserRole::CustomerOwner,
            'status' => UserStatus::Active,
            'company_id' => null,
            'email' => 'owner@prior.example',
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->postJson('/api/v1/account/bootstrap-organisation', [
                'name' => 'Different Typed Name',
                'billing_email' => 'owner@prior.example',
            ])
            ->assertCreated()
            ->assertJsonPath('data.company.id', (string) $existing->id);

        $user->refresh();
        /** @phpstan-ignore-next-line */
        $this->assertSame((string) $existing->id, (string) $user->company_id);
        $this->assertSame(1, Company::query()->where('billing_email', 'owner@prior.example')->count());
    }

    #[Test]
    public function internal_user_cannot_bootstrap_via_portal_route(): void
    {
        $staff = User::factory()->create([
            'role' => UserRole::Admin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $staff->id)
            ->postJson('/api/v1/account/bootstrap-organisation', ['name' => 'Nope Org'])
            ->assertForbidden()
            /** @phpstan-ignore-next-line */
            ->assertJsonPath('success', false);
    }

    #[Test]
    public function customer_can_register_as_sole_customer(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::CustomerOwner,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->postJson('/api/v1/account/bootstrap-organisation', [
                'registration_type' => 'sole_customer',
                'name' => 'Jordan Smith · KnifeCare',
                'city' => 'Salford',
            ])
            ->assertCreated()
            ->assertJsonPath('data.company.is_sole_customer', true);

        $user->refresh();
        /** @phpstan-ignore-next-line */
        $company = Company::query()->findOrFail($user->company_id);

        /** @phpstan-ignore-next-line */
        $this->assertTrue((bool) $company->is_sole_customer);
        /** @phpstan-ignore-next-line */
        $this->assertSame('Jordan Smith · KnifeCare', $company->name);
        /** @phpstan-ignore-next-line */
        $this->assertTrue(str_starts_with((string) $company->slug, 'solo-'));
    }
}
