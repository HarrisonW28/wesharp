<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\ServiceArea;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminServiceAreasApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_can_list_create_update_and_delete_service_areas(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);

        $list = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->getJson('/api/admin/service-areas');
        $list->assertOk()->assertJsonPath('success', true);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson('/api/admin/service-areas', [
            'name' => 'Test zone',
            'city' => 'Leeds',
            'region' => 'West Yorkshire',
            'country' => 'GB',
            'postcode_prefix' => 'LS',
            'centre_latitude' => 53.8,
            'centre_longitude' => -1.55,
            'radius_metres' => 8000,
            'active' => true,
        ]);
        $res->assertCreated()
            ->assertJsonPath('data.area.city', 'Leeds')
            ->assertJsonPath('data.area.radius_metres', 8000);

        $id = (string) $res->json('data.area.id');

        $upd = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->putJson('/api/admin/service-areas/'.$id, [
            'active' => false,
        ]);
        $upd->assertOk()->assertJsonPath('data.area.active', false);

        $del = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->delete('/api/admin/service-areas/'.$id);
        $del->assertNoContent();

        self::assertTrue(AuditLog::query()->where('action', 'service_area.created')->exists());
        self::assertTrue(AuditLog::query()->where('action', 'service_area.updated')->exists());
        self::assertTrue(AuditLog::query()->where('action', 'service_area.deleted')->exists());
    }

    public function test_store_rejects_radius_without_centre(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson('/api/admin/service-areas', [
            'name' => 'Bad',
            'city' => 'X',
            'radius_metres' => 1000,
        ])->assertStatus(422);
    }

    public function test_route_manager_can_list_but_not_mutate(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);
        ServiceArea::factory()->create(['name' => 'Zone A']);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/service-areas')
            ->assertOk()
            ->assertJsonPath('data.items.0.name', 'Zone A');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson('/api/admin/service-areas', [
            'name' => 'N',
            'city' => 'C',
        ])->assertStatus(403);
    }

    public function test_developer_cannot_list_service_areas(): void
    {
        $user = User::factory()->create(['role' => UserRole::Developer]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/service-areas')
            ->assertStatus(403);
    }
}
