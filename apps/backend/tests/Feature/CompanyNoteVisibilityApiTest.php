<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\NoteVisibility;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Note;
use App\Models\User;
use App\Support\Portal\BookingTrackingToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CompanyNoteVisibilityApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_route_manager_cannot_see_finance_notes_on_company_detail(): void
    {
        $company = Company::factory()->create();
        Note::factory()->create([
            'noteable_type' => Company::class,
            'noteable_id' => $company->id,
            'body' => 'Finance only',
            'visibility' => NoteVisibility::Finance,
        ]);
        Note::factory()->create([
            'noteable_type' => Company::class,
            'noteable_id' => $company->id,
            'body' => 'Route visible',
            'visibility' => NoteVisibility::Route,
        ]);

        $routeManager = User::factory()->create(['role' => UserRole::RouteManager]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
            ->getJson('/api/admin/companies/'.$company->id)
            ->assertOk();

        $bodies = collect($res->json('data.notes'))->pluck('body')->all();
        self::assertContains('Route visible', $bodies);
        self::assertNotContains('Finance only', $bodies);
    }

    public function test_finance_user_cannot_see_route_notes_on_company_detail(): void
    {
        $company = Company::factory()->create();
        Note::factory()->create([
            'noteable_type' => Company::class,
            'noteable_id' => $company->id,
            'body' => 'Route only',
            'visibility' => NoteVisibility::Route,
        ]);
        Note::factory()->create([
            'noteable_type' => Company::class,
            'noteable_id' => $company->id,
            'body' => 'Finance visible',
            'visibility' => NoteVisibility::Finance,
        ]);

        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/companies/'.$company->id)
            ->assertOk();

        $bodies = collect($res->json('data.notes'))->pluck('body')->all();
        self::assertContains('Finance visible', $bodies);
        self::assertNotContains('Route only', $bodies);
    }

    public function test_tenant_booking_detail_includes_only_customer_company_notes(): void
    {
        $company = Company::factory()->create();
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $user = User::factory()->create([
            'company_id' => $company->id,
            'role' => UserRole::CustomerOwner,
        ]);

        Note::factory()->create([
            'noteable_type' => Company::class,
            'noteable_id' => $company->id,
            'body' => 'Internal secret',
            'visibility' => NoteVisibility::Internal,
        ]);
        Note::factory()->create([
            'noteable_type' => Company::class,
            'noteable_id' => $company->id,
            'body' => 'Hello customer',
            'visibility' => NoteVisibility::Customer,
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/account/bookings/'.$booking->id)
            ->assertOk();

        $notes = $res->json('data.customer_company_notes');
        self::assertIsArray($notes);
        self::assertCount(1, $notes);
        self::assertSame('Hello customer', $notes[0]['body']);
    }

    public function test_public_tracking_includes_only_customer_company_notes(): void
    {
        $company = Company::factory()->create();
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $token = BookingTrackingToken::mint($booking);

        Note::factory()->create([
            'noteable_type' => Company::class,
            'noteable_id' => $company->id,
            'body' => 'Staff eyes only',
            'visibility' => NoteVisibility::Internal,
        ]);
        Note::factory()->create([
            'noteable_type' => Company::class,
            'noteable_id' => $company->id,
            'body' => 'Welcome',
            'visibility' => NoteVisibility::Customer,
        ]);

        $json = $this->getJson('/api/public/track/'.$token)
            ->assertOk()
            ->json('data');

        $notes = $json['customer_company_notes'] ?? null;
        self::assertIsArray($notes);
        self::assertCount(1, $notes);
        self::assertSame('Welcome', $notes[0]['body']);
        self::assertStringNotContainsString('Staff eyes only', json_encode($json, JSON_THROW_ON_ERROR));
    }
}
