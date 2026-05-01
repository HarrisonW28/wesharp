<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\OperationalRoute;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminRouteAccessApiTest extends TestCase
{
    use RefreshDatabase;

    private function headers(User $user): array
    {
        return ['X-WeSharp-Test-User-Id' => (string) $user->id];
    }

    public function test_route_manager_cannot_view_route_assigned_to_another_driver(): void
    {
        $day = '2026-08-01';

        $alice = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $bob = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'scheduled_date' => $day,
            'driver_user_id' => $bob->id,
        ]);

        $this->withHeaders($this->headers($alice))
            ->getJson('/api/admin/routes/'.$route->id)
            ->assertForbidden();
    }

    public function test_route_manager_can_view_unassigned_route(): void
    {
        $day = '2026-08-02';

        $planner = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'scheduled_date' => $day,
            'driver_user_id' => null,
        ]);

        $this->withHeaders($this->headers($planner))
            ->getJson('/api/admin/routes/'.$route->id)
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_route_index_excludes_other_drivers_for_route_manager(): void
    {
        $day = '2026-08-03';

        $alice = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $bob = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $aliceRoute = OperationalRoute::factory()->create([
            'scheduled_date' => $day,
            'name' => 'Alice only',
            'driver_user_id' => $alice->id,
        ]);

        $bobRoute = OperationalRoute::factory()->create([
            'scheduled_date' => $day,
            'name' => 'Bob only',
            'driver_user_id' => $bob->id,
        ]);

        $res = $this->withHeaders($this->headers($alice))
            ->getJson('/api/admin/routes?date='.$day);

        $res->assertOk();
        $ids = collect($res->json('data.items'))->pluck('id')->all();
        self::assertContains((string) $aliceRoute->id, $ids);
        self::assertNotContains((string) $bobRoute->id, $ids);
    }
}
