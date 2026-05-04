<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Support\Stripe\ResolvedStripeConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class AdminStripeSettingsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_developer_can_show_stripe_settings(): void
    {
        Config::set('stripe.secret', 'sk_test_from_env');
        App::forgetInstance(ResolvedStripeConfig::class);

        $dev = User::factory()->create([
            'role' => UserRole::Developer,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $dev->id)
            ->getJson('/api/admin/stripe-settings')
            ->assertOk()
            ->assertJsonPath('data.integration.secret_key.effective_configured', true)
            ->assertJsonPath('data.integration.secret_key.database_override', false);
    }

    public function test_super_admin_can_show_stripe_settings(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/stripe-settings')
            ->assertOk();
    }

    public function test_admin_forbidden(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->getJson('/api/admin/stripe-settings')
            ->assertForbidden();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->putJson('/api/admin/stripe-settings', [])
            ->assertForbidden();
    }

    public function test_update_encrypts_secret_at_rest(): void
    {
        $dev = User::factory()->create([
            'role' => UserRole::Developer,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $plain = 'sk_test_abcdefghijklmnop';

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $dev->id)
            ->putJson('/api/admin/stripe-settings', [
                'secret_key' => $plain,
            ])
            ->assertOk()
            ->assertJsonPath('data.integration.secret_key.database_override', true);

        $raw = (string) DB::table('stripe_settings')->value('secret_key');
        self::assertStringNotContainsString($plain, $raw);

        App::forgetInstance(ResolvedStripeConfig::class);
        self::assertSame($plain, App::make(ResolvedStripeConfig::class)->secretKey());
    }

    public function test_clear_secret_falls_back_to_env(): void
    {
        Config::set('stripe.secret', 'sk_test_env_fallback');
        $dev = User::factory()->create([
            'role' => UserRole::Developer,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $dev->id)
            ->putJson('/api/admin/stripe-settings', ['secret_key' => 'sk_test_override'])
            ->assertOk();

        App::forgetInstance(ResolvedStripeConfig::class);
        self::assertSame('sk_test_override', App::make(ResolvedStripeConfig::class)->secretKey());

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $dev->id)
            ->putJson('/api/admin/stripe-settings', ['secret_key' => ''])
            ->assertOk();

        App::forgetInstance(ResolvedStripeConfig::class);
        self::assertSame('sk_test_env_fallback', App::make(ResolvedStripeConfig::class)->secretKey());
    }

    public function test_rejects_malformed_secret_key(): void
    {
        $dev = User::factory()->create([
            'role' => UserRole::Developer,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $dev->id)
            ->putJson('/api/admin/stripe-settings', ['secret_key' => 'not_a_stripe_key'])
            ->assertStatus(422);
    }
}
