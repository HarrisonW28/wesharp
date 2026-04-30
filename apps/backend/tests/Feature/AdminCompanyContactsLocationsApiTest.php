<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Company;
use App\Models\Contact;
use App\Models\CompanyLocation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminCompanyContactsLocationsApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);
    }

    private function headers(User $u): array
    {
        return ['X-WeSharp-Test-User-Id' => (string) $u->id];
    }

    public function test_contact_update_archive_restore_and_primary(): void
    {
        $admin = $this->admin();
        $company = Company::factory()->create();
        $a = Contact::factory()->create([
            'company_id' => $company->id,
            'billing_contact' => true,
        ]);
        $b = Contact::factory()->create([
            'company_id' => $company->id,
            'billing_contact' => false,
        ]);

        $this->withHeaders($this->headers($admin))
            ->putJson('/api/admin/companies/'.$company->id.'/contacts/'.$b->id, [
                'first_name' => 'Updated',
                'last_name' => 'Person',
                'notes' => 'Prefers morning calls.',
            ])
            ->assertOk()
            ->assertJsonPath('data.first_name', 'Updated')
            ->assertJsonPath('data.notes', 'Prefers morning calls.');

        $this->withHeaders($this->headers($admin))
            ->postJson('/api/admin/companies/'.$company->id.'/contacts/'.$b->id.'/set-primary')
            ->assertOk()
            ->assertJsonPath('data.billing_contact', true);

        self::assertTrue(Contact::query()->findOrFail($a->id)->billing_contact === false);
        self::assertTrue(Contact::query()->findOrFail($b->id)->billing_contact === true);

        $this->withHeaders($this->headers($admin))
            ->postJson('/api/admin/companies/'.$company->id.'/contacts/'.$a->id.'/archive')
            ->assertOk()
            ->assertJsonPath('data.is_archived', true);

        self::assertNotNull(Contact::query()->findOrFail($a->id)->archived_at);

        $this->withHeaders($this->headers($admin))
            ->postJson('/api/admin/companies/'.$company->id.'/contacts/'.$a->id.'/restore')
            ->assertOk()
            ->assertJsonPath('data.is_archived', false);
    }

    public function test_location_update_archive_restore_default_and_booking_rejects_archived_site(): void
    {
        $admin = $this->admin();
        $company = Company::factory()->create();
        $locA = CompanyLocation::factory()->create([
            'company_id' => $company->id,
            'is_default' => true,
            'label' => 'Site A',
        ]);
        $locB = CompanyLocation::factory()->create([
            'company_id' => $company->id,
            'is_default' => false,
            'label' => 'Site B',
        ]);

        $this->withHeaders($this->headers($admin))
            ->putJson('/api/admin/companies/'.$company->id.'/locations/'.$locB->id, [
                'notes' => 'Ring the service bell.',
                'postcode' => 'M1 1AE',
            ])
            ->assertOk()
            ->assertJsonPath('data.notes', 'Ring the service bell.');

        $this->withHeaders($this->headers($admin))
            ->postJson('/api/admin/companies/'.$company->id.'/locations/'.$locB->id.'/set-default')
            ->assertOk()
            ->assertJsonPath('data.is_default', true);

        self::assertTrue(CompanyLocation::query()->findOrFail($locA->id)->is_default === false);
        self::assertTrue(CompanyLocation::query()->findOrFail($locB->id)->is_default === true);

        $this->withHeaders($this->headers($admin))
            ->postJson('/api/admin/companies/'.$company->id.'/locations/'.$locB->id.'/archive')
            ->assertOk()
            ->assertJsonPath('data.is_archived', true);

        $promoted = CompanyLocation::query()
            ->where('company_id', $company->id)
            ->whereNull('archived_at')
            ->where('is_default', true)
            ->first();
        self::assertNotNull($promoted);
        self::assertSame((string) $locA->id, (string) $promoted->id);

        $this->withHeaders($this->headers($admin))
            ->postJson('/api/admin/companies/'.$company->id.'/bookings', [
                'company_location_id' => (string) $locB->id,
                'scheduled_date' => now()->addWeek()->toDateString(),
                'service_type' => 'collection',
            ])
            ->assertStatus(422);

        $this->withHeaders($this->headers($admin))
            ->postJson('/api/admin/companies/'.$company->id.'/locations/'.$locB->id.'/restore')
            ->assertOk()
            ->assertJsonPath('data.is_archived', false);
    }

    public function test_route_manager_cannot_update_contact(): void
    {
        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);

        $this->withHeaders($this->headers($driver))
            ->putJson('/api/admin/companies/'.$company->id.'/contacts/'.$contact->id, [
                'first_name' => 'Nope',
            ])
            ->assertForbidden();
    }
}
