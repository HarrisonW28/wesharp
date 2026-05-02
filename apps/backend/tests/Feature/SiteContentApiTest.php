<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\SiteContentSetting;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SiteContentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_public_site_content_returns_success_and_default_hero_title(): void
    {
        $this->getJson('/api/public/site-content')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.content.homepage.hero_title', 'Professional knife sharpening, collected from your door.');
    }

    public function test_settings_manage_can_put_site_content_and_public_reads_override(): void
    {
        $admin = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $get = $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->getJson('/api/admin/site-content');

        $get->assertOk();
        $content = $get->json('data.content');
        self::assertIsArray($content);

        $content['homepage']['hero_badge'] = 'Sprint test badge';

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->putJson('/api/admin/site-content', ['content' => $content])
            ->assertOk()
            ->assertJsonPath('data.content.homepage.hero_badge', 'Sprint test badge');

        $this->getJson('/api/public/site-content')
            ->assertJsonPath('data.content.homepage.hero_badge', 'Sprint test badge');

        self::assertTrue(
            AuditLog::query()->where('action', 'site_content.updated')->exists(),
        );
    }

    public function test_finance_cannot_update_site_content(): void
    {
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->putJson('/api/admin/site-content', ['content' => ['homepage' => ['hero_title' => 'x']]])
            ->assertForbidden();
    }

    public function test_portal_user_cannot_access_admin_site_content(): void
    {
        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $portal->id)
            ->getJson('/api/admin/site-content')
            ->assertForbidden();
    }

    public function test_developer_can_delete_site_content_overrides_and_public_reverts(): void
    {
        $admin = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $dev = User::factory()->create([
            'role' => UserRole::Developer,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $get = $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->getJson('/api/admin/site-content');
        $get->assertOk();
        /** @var array<string, mixed> $content */
        $content = $get->json('data.content');
        $content['homepage']['hero_badge'] = 'Dev will clear me';

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->putJson('/api/admin/site-content', ['content' => $content])
            ->assertOk();

        $this->getJson('/api/public/site-content')
            ->assertJsonPath('data.content.homepage.hero_badge', 'Dev will clear me');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $dev->id)
            ->deleteJson('/api/admin/site-content')
            ->assertOk()
            ->assertJsonPath('data.content.homepage.hero_badge', 'Greater Manchester & Liverpool');

        $this->getJson('/api/public/site-content')
            ->assertJsonPath('data.content.homepage.hero_badge', 'Greater Manchester & Liverpool');

        self::assertTrue(
            AuditLog::query()->where('action', 'site_content.cleared')->exists(),
        );
        $row = SiteContentSetting::query()->first();
        self::assertNotNull($row);
        self::assertSame([], $row->overrides ?? []);
    }

    public function test_finance_cannot_delete_site_content_overrides(): void
    {
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->deleteJson('/api/admin/site-content')
            ->assertForbidden();
    }
}
