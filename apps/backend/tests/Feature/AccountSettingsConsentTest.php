<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountSettingsConsentTest extends TestCase
{
    use RefreshDatabase;

    public function test_marketing_opt_in_does_not_set_terms_accepted_at(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $portalUser = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        self::assertNull($portalUser->terms_accepted_at);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $portalUser->id)
            ->putJson('/api/account/settings', [
                'user' => [
                    'marketing_opt_in' => true,
                ],
            ])
            ->assertOk();

        $portalUser->refresh();
        self::assertTrue($portalUser->marketing_opt_in);
        self::assertNotNull($portalUser->marketing_opt_in_at);
        self::assertSame('account_settings', $portalUser->marketing_opt_in_source);
        self::assertNull($portalUser->terms_accepted_at);
    }

    public function test_accept_portal_terms_sets_terms_without_requiring_marketing(): void
    {
        $company = Company::factory()->create();
        $user = User::factory()->create([
            'company_id' => $company->id,
            'marketing_opt_in' => false,
        ]);
        self::assertNull($user->terms_accepted_at);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->putJson('/api/account/settings', [
                'user' => [
                    'accept_portal_terms' => true,
                ],
            ])
            ->assertOk();

        $user->refresh();
        self::assertNotNull($user->terms_accepted_at);
        self::assertFalse($user->marketing_opt_in);
    }
}
