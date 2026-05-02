<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CustomerPortalInviteStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\CustomerPortalInvite;
use App\Models\User;
use App\Services\Crm\CustomerPortalInviteFulfillment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class CustomerPortalInviteApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_send_portal_invite_and_it_appears_on_company_detail(): void
    {
        Http::fake([
            'https://api.clerk.com/*' => Http::response(['id' => 'inv_test_xyz'], 200),
        ]);
        config(['clerk.secret' => 'sk_test_fake', 'clerk.api_base' => 'https://api.clerk.com/v1']);

        $admin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $company = Company::factory()->create();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->postJson('/api/admin/companies/'.$company->id.'/portal-invites', [
                'email' => 'Invitee@Example.COM',
            ]);

        $res->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.invite.email', 'invitee@example.com')
            ->assertJsonPath('data.invite.display_status', 'pending')
            ->assertJsonPath('data.invite.clerk_invitation_id', 'inv_test_xyz');

        self::assertTrue(AuditLog::query()->where('action', 'customer_portal_invite.sent')->exists());

        $detail = $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->getJson('/api/admin/companies/'.$company->id);

        $detail->assertOk()
            ->assertJsonPath('data.portal_invites.0.email', 'invitee@example.com');
    }

    public function test_resend_updates_row_and_records_audit(): void
    {
        Http::fake([
            'https://api.clerk.com/*' => Http::response(['id' => 'inv_resend'], 200),
        ]);
        config(['clerk.secret' => 'sk_test_fake', 'clerk.api_base' => 'https://api.clerk.com/v1']);

        $admin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $company = Company::factory()->create();
        $invite = CustomerPortalInvite::factory()->for($company)->create([
            'email' => 'r@example.com',
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->postJson('/api/admin/companies/'.$company->id.'/portal-invites/'.$invite->id.'/resend')
            ->assertOk()
            ->assertJsonPath('data.invite.clerk_invitation_id', 'inv_resend');

        self::assertTrue(AuditLog::query()->where('action', 'customer_portal_invite.resent')->exists());
    }

    public function test_cannot_invite_staff_email(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $company = Company::factory()->create();
        User::factory()->create([
            'email' => 'finance@example.com',
            'role' => UserRole::Finance,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->postJson('/api/admin/companies/'.$company->id.'/portal-invites', [
                'email' => 'finance@example.com',
            ])
            ->assertStatus(422);
    }

    public function test_fulfillment_links_customer_on_pending_invite(): void
    {
        $company = Company::factory()->create();
        CustomerPortalInvite::factory()->for($company)->create([
            'email' => 'join@example.com',
            'last_sent_at' => now(),
            'expires_at' => now()->addDay(),
        ]);

        $user = User::factory()->create([
            'email' => 'join@example.com',
            'role' => UserRole::CustomerOwner,
            'company_id' => null,
        ]);

        CustomerPortalInviteFulfillment::tryFulfill($user);

        $user->refresh();
        self::assertSame((string) $company->id, (string) $user->company_id);

        $invite = CustomerPortalInvite::query()->where('email', 'join@example.com')->first();
        self::assertNotNull($invite);
        self::assertTrue($invite->status === CustomerPortalInviteStatus::Accepted);

        self::assertTrue(AuditLog::query()->where('action', 'customer_portal_invite.accepted_auto')->exists());
    }

    public function test_fulfillment_does_not_run_for_internal_users(): void
    {
        $company = Company::factory()->create();
        CustomerPortalInvite::factory()->for($company)->create([
            'email' => 'admin@example.com',
        ]);

        $user = User::factory()->create([
            'email' => 'admin@example.com',
            'role' => UserRole::Admin,
            'company_id' => null,
        ]);

        CustomerPortalInviteFulfillment::tryFulfill($user);

        $user->refresh();
        self::assertNull($user->company_id);
    }

    public function test_route_manager_cannot_send_invite(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);
        $company = Company::factory()->create();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->postJson('/api/admin/companies/'.$company->id.'/portal-invites', ['email' => 'a@b.com'])
            ->assertForbidden();
    }
}
