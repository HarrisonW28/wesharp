<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\EvidencePhotoCategory;
use App\Enums\EvidencePhotoVisibility;
use App\Enums\RouteStopStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\DamageReport;
use App\Models\EvidencePhoto;
use App\Models\Knife;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\RouteStop;
use App\Models\UploadedFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile as HttpUploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Database\Seeders\WeSharpDemoSeeder;
use Tests\TestCase;

final class EvidencePhotoApiTest extends TestCase
{
    use RefreshDatabase;

    private function driverHeaders(User $user): array
    {
        return ['X-WeSharp-Test-User-Id' => (string) $user->id];
    }

    /** @return array<string, string> */
    private function opsStaffHeaders(): array
    {
        $this->seed(WeSharpDemoSeeder::class);
        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        return ['X-WeSharp-Test-User-Id' => (string) $ops->id];
    }

    public function test_driver_can_upload_collection_proof_and_see_on_stop_detail(): void
    {
        Storage::fake('local');

        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'driver_user_id' => $driver->id,
        ]);

        $booking = Booking::factory()->create([
            'booking_status' => BookingStatus::AssignedToRoute,
            'assigned_route_id' => $route->id,
        ]);

        $order = Order::factory()->create([
            'company_id' => $booking->company_id,
            'booking_id' => $booking->id,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => $booking->id,
            'route_stop_status' => RouteStopStatus::Arrived,
            'sequence' => 1,
        ]);

        $file = HttpUploadedFile::fake()->image('collection.jpg', 640, 480);

        $this->withHeaders($this->driverHeaders($driver))
            ->post('/api/admin/route-stops/'.$stop->id.'/evidence-photos', [
                'photo' => $file,
                'category' => EvidencePhotoCategory::CollectionProof->value,
                'caption' => 'Handover complete',
            ])
            ->assertCreated()
            ->assertJsonPath('data.category', EvidencePhotoCategory::CollectionProof->value)
            ->assertJsonPath('data.visibility', EvidencePhotoVisibility::InternalOnly->value);

        $detail = $this->withHeaders($this->driverHeaders($driver))
            ->getJson('/api/admin/route-stops/'.$stop->id)
            ->assertOk()
            ->json('data');

        self::assertIsArray($detail['evidence_photos'] ?? null);
        self::assertCount(1, $detail['evidence_photos']);
        self::assertSame('Handover complete', $detail['evidence_photos'][0]['caption']);

        self::assertTrue(
            AuditLog::query()->where('action', 'evidence_photo.uploaded')->exists()
        );
    }

    public function test_require_collection_photo_blocks_mark_collected_until_upload(): void
    {
        Config::set('wesharp_evidence.require_collection_photo', true);

        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'driver_user_id' => $driver->id,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Arrived,
            'sequence' => 1,
        ]);

        $this->withHeaders($this->driverHeaders($driver))
            ->postJson('/api/admin/route-stops/'.$stop->id.'/mark-collected')
            ->assertStatus(422);
    }

    public function test_customer_sees_only_customer_visible_photos_on_order(): void
    {
        Config::set('wesharp_evidence.show_in_customer_portal', true);

        $company = \App\Models\Company::factory()->create();

        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
        ]);

        $uploadInternal = UploadedFile::factory()->create([
            'disk' => 'local',
            'path' => 'order-evidence/internal.jpg',
        ]);
        Storage::disk('local')->put($uploadInternal->path, 'x');

        $uploadVisible = UploadedFile::factory()->create([
            'disk' => 'local',
            'path' => 'order-evidence/visible.jpg',
        ]);
        Storage::disk('local')->put($uploadVisible->path, 'y');

        EvidencePhoto::factory()->forOrder($order)->create([
            'uploaded_file_id' => $uploadInternal->id,
            'visibility' => EvidencePhotoVisibility::InternalOnly,
            'category' => EvidencePhotoCategory::GeneralOrder,
        ]);

        EvidencePhoto::factory()->forOrder($order)->create([
            'uploaded_file_id' => $uploadVisible->id,
            'visibility' => EvidencePhotoVisibility::CustomerVisible,
            'category' => EvidencePhotoCategory::GeneralOrder,
            'caption' => 'Your knives are on the van',
        ]);

        $tenant = User::factory()->create([
            'company_id' => $company->id,
            'role' => UserRole::CustomerOwner,
        ]);

        $json = $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)
            ->getJson('/api/account/orders/'.$order->id)
            ->assertOk()
            ->json('data');

        self::assertIsArray($json['photos'] ?? null);
        self::assertCount(1, $json['photos']);
        self::assertSame('Your knives are on the van', $json['photos'][0]['caption']);
    }

    public function test_customer_cannot_fetch_internal_photo_file(): void
    {
        Config::set('wesharp_evidence.show_in_customer_portal', true);

        $company = \App\Models\Company::factory()->create();
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
        ]);

        $upload = UploadedFile::factory()->create(['disk' => 'local', 'path' => 'order-evidence/hidden.jpg']);
        Storage::disk('local')->put($upload->path, 'secret');

        /** @var EvidencePhoto $photo */
        $photo = EvidencePhoto::factory()->forOrder($order)->create([
            'uploaded_file_id' => $upload->id,
            'visibility' => EvidencePhotoVisibility::InternalOnly,
            'category' => EvidencePhotoCategory::GeneralOrder,
        ]);

        $tenant = User::factory()->create([
            'company_id' => $company->id,
            'role' => UserRole::CustomerOwner,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)
            ->get('/api/account/orders/'.$order->id.'/evidence-photos/'.$photo->id.'/file')
            ->assertForbidden();
    }

    public function test_customer_cannot_fetch_customer_visible_photo_for_another_companys_order(): void
    {
        Config::set('wesharp_evidence.show_in_customer_portal', true);

        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $orderB = Order::factory()->create(['company_id' => $companyB->id]);

        $upload = UploadedFile::factory()->create(['disk' => 'local', 'path' => 'order-evidence/other-co.jpg']);
        Storage::disk('local')->put($upload->path, 'payload');

        /** @var EvidencePhoto $photo */
        $photo = EvidencePhoto::factory()->forOrder($orderB)->create([
            'uploaded_file_id' => $upload->id,
            'visibility' => EvidencePhotoVisibility::CustomerVisible,
            'category' => EvidencePhotoCategory::GeneralOrder,
        ]);

        $tenantA = User::factory()->create([
            'company_id' => $companyA->id,
            'role' => UserRole::CustomerOwner,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenantA->id)
            ->get('/api/account/orders/'.$orderB->id.'/evidence-photos/'.$photo->id.'/file')
            ->assertForbidden();
    }

    public function test_staff_can_upload_workshop_category_on_order(): void
    {
        Storage::fake('local');

        $h = $this->opsStaffHeaders();
        $order = Order::query()->whereHas('knives')->firstOrFail();
        $file = HttpUploadedFile::fake()->image('intake.jpg', 400, 300);

        $this->post('/api/admin/orders/'.$order->id.'/evidence-photos', [
            'photo' => $file,
            'category' => EvidencePhotoCategory::IntakeCondition->value,
            'visibility' => EvidencePhotoVisibility::InternalOnly->value,
            'caption' => 'Tray on intake',
        ], $h)
            ->assertCreated()
            ->assertJsonPath('data.category', EvidencePhotoCategory::IntakeCondition->value);

        self::assertTrue(
            AuditLog::query()->where('action', 'evidence_photo.uploaded')->exists()
        );
    }

    public function test_staff_can_upload_evidence_on_knife(): void
    {
        Storage::fake('local');

        $h = $this->opsStaffHeaders();
        /** @var Knife $knife */
        $knife = Knife::query()->whereNotNull('order_id')->firstOrFail();
        $file = HttpUploadedFile::fake()->image('blade.jpg', 400, 300);

        $this->post('/api/admin/knives/'.$knife->id.'/evidence-photos', [
            'photo' => $file,
            'category' => EvidencePhotoCategory::KnifeDetail->value,
        ], $h)
            ->assertCreated()
            ->assertJsonPath('data.knife_id', (string) $knife->id)
            ->assertJsonPath('data.order_id', (string) $knife->order_id);
    }

    public function test_staff_can_upload_evidence_on_damage_report(): void
    {
        Storage::fake('local');

        $this->seed(WeSharpDemoSeeder::class);
        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        /** @var array<string, string> $auth */
        $auth = ['X-WeSharp-Test-User-Id' => (string) $ops->id];

        $order = Order::query()->whereHas('knives')->firstOrFail();
        /** @var Knife $knife */
        $knife = $order->knives()->firstOrFail();

        $this->postJson('/api/admin/knives/'.$knife->id.'/damage-reports', [
            'order_id' => (string) $order->id,
            'description' => 'Chip near tip for evidence test',
            'severity' => \App\Enums\DamageReportSeverity::Minor->value,
            'customer_visible' => false,
        ], $auth)
            ->assertCreated();

        /** @var DamageReport $report */
        $report = DamageReport::query()->where('knife_id', $knife->id)->orderByDesc('created_at')->firstOrFail();
        $reportId = (string) $report->id;

        $file = HttpUploadedFile::fake()->image('dmg.jpg', 400, 300);

        $this->post('/api/admin/damage-reports/'.$reportId.'/evidence-photos', [
            'photo' => $file,
            'category' => EvidencePhotoCategory::WorkshopDamage->value,
        ], $auth)
            ->assertCreated()
            ->assertJsonPath('data.damage_report_id', $reportId)
            ->assertJsonPath('data.category', EvidencePhotoCategory::WorkshopDamage->value);
    }

    public function test_visibility_change_is_audited(): void
    {
        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'driver_user_id' => $driver->id,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Arrived,
        ]);

        $upload = UploadedFile::factory()->create([
            'fileable_type' => RouteStop::class,
            'fileable_id' => $stop->id,
            'disk' => 'local',
            'path' => 'route-stop-evidence/x.jpg',
        ]);
        Storage::disk('local')->put($upload->path, 'z');

        /** @var EvidencePhoto $photo */
        $photo = EvidencePhoto::factory()->forRouteStop($stop)->create([
            'uploaded_file_id' => $upload->id,
            'visibility' => EvidencePhotoVisibility::InternalOnly,
            'category' => EvidencePhotoCategory::CollectionProof,
        ]);

        $this->withHeaders($this->driverHeaders($driver))
            ->patchJson('/api/admin/evidence-photos/'.$photo->id, [
                'visibility' => EvidencePhotoVisibility::CustomerVisible->value,
            ])
            ->assertOk();

        self::assertTrue(
            AuditLog::query()->where('action', 'evidence_photo.visibility_changed')->exists()
        );
    }

    public function test_order_evidence_rejects_customer_visible_upload_when_disabled(): void
    {
        Storage::fake('local');
        Config::set('wesharp_evidence.allow_customer_visible_photos', false);

        $headers = $this->opsStaffHeaders();
        /** @phpstan-ignore-next-line */
        $order = Order::factory()->create();

        $file = HttpUploadedFile::fake()->image('proof.jpg', 320, 240);

        $this->withHeaders($headers)
            ->post('/api/admin/orders/'.$order->id.'/evidence-photos', [
                'photo' => $file,
                'category' => EvidencePhotoCategory::GeneralOrder->value,
                'visibility' => EvidencePhotoVisibility::CustomerVisible->value,
            ])
            ->assertForbidden();
    }
}
