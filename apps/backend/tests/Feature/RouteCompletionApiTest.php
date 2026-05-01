<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\EvidencePhotoCategory;
use App\Enums\OperationalRouteStatus;
use App\Enums\RouteStopStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\EvidencePhoto;
use App\Models\OperationalRoute;
use App\Models\RouteStop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

final class RouteCompletionApiTest extends TestCase
{
    use RefreshDatabase;

    private function headers(User $user): array
    {
        return ['X-WeSharp-Test-User-Id' => (string) $user->id];
    }

    public function test_completion_summary_endpoint_returns_counts(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'route_status' => OperationalRouteStatus::InProgress,
            'driver_user_id' => null,
        ]);

        RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Completed,
            'sequence' => 1,
        ]);
        RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Skipped,
            'sequence' => 2,
            'failure_reason' => 'Closed',
        ]);

        $res = $this->withHeaders($this->headers($admin))
            ->getJson('/api/admin/routes/'.$route->id.'/completion-summary');

        $res->assertOk();
        $res->assertJsonPath('data.stops_total', 2);
        $res->assertJsonPath('data.stops_completed_success', 1);
        $res->assertJsonPath('data.stops_failed', 1);
        $res->assertJsonPath('data.stops_outstanding', 0);
        $res->assertJsonPath('data.blocks_completion', false);
        self::assertTrue($res->json('data.can_force_complete'));
    }

    public function test_complete_route_blocked_when_stop_outstanding(): void
    {
        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'route_status' => OperationalRouteStatus::InProgress,
            'driver_user_id' => $driver->id,
        ]);

        RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Completed,
            'sequence' => 1,
        ]);
        RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Travelling,
            'sequence' => 2,
        ]);

        $res = $this->withHeaders($this->headers($driver))
            ->postJson('/api/admin/routes/'.$route->id.'/complete', []);

        $res->assertStatus(422);
        $res->assertJsonPath('error.code', 'route_completion_blocked');
        self::assertGreaterThan(0, count((array) $res->json('error.details.summary.outstanding_stops')));
    }

    public function test_complete_route_sets_completed_at_and_audit_when_all_resolved(): void
    {
        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'route_status' => OperationalRouteStatus::InProgress,
            'driver_user_id' => $driver->id,
        ]);

        RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Completed,
            'sequence' => 1,
        ]);

        $res = $this->withHeaders($this->headers($driver))
            ->postJson('/api/admin/routes/'.$route->id.'/complete', []);

        $res->assertOk();
        $res->assertJsonPath('data.route_status', OperationalRouteStatus::Completed->value);
        self::assertNotNull($res->json('data.completed_at'));

        $route->refresh();
        self::assertSame(OperationalRouteStatus::Completed, $route->route_status);
        self::assertNotNull($route->completed_at);

        $audit = AuditLog::query()->where('action', 'route.completed')->latest('id')->first();
        self::assertNotNull($audit);
        self::assertFalse((bool) ($audit->payload['force_complete'] ?? false));
    }

    public function test_driver_cannot_force_complete(): void
    {
        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'route_status' => OperationalRouteStatus::InProgress,
            'driver_user_id' => $driver->id,
        ]);

        RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Arrived,
            'sequence' => 1,
        ]);

        $this->withHeaders($this->headers($driver))
            ->postJson('/api/admin/routes/'.$route->id.'/complete', ['force_complete' => true])
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'route_completion_override_forbidden');
    }

    public function test_admin_may_force_complete_with_open_stop(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'route_status' => OperationalRouteStatus::InProgress,
            'driver_user_id' => null,
        ]);

        RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Arrived,
            'sequence' => 1,
        ]);

        $res = $this->withHeaders($this->headers($admin))
            ->postJson('/api/admin/routes/'.$route->id.'/complete', ['force_complete' => true]);

        $res->assertOk();
        $res->assertJsonPath('data.route_status', OperationalRouteStatus::Completed->value);

        $audit = AuditLog::query()->where('action', 'route.completed')->latest('id')->first();
        self::assertNotNull($audit);
        self::assertTrue((bool) ($audit->payload['force_complete'] ?? false));
    }

    public function test_missing_required_return_photo_blocks_completion(): void
    {
        Config::set('wesharp_evidence.require_return_photo', true);

        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'route_status' => OperationalRouteStatus::InProgress,
            'driver_user_id' => $driver->id,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Completed,
            'sequence' => 1,
        ]);

        EvidencePhoto::factory()->create([
            'route_stop_id' => $stop->id,
            'category' => EvidencePhotoCategory::CollectionProof,
        ]);

        $this->withHeaders($this->headers($driver))
            ->postJson('/api/admin/routes/'.$route->id.'/complete', [])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'route_completion_blocked');
    }
}
