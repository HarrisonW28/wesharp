<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class AdminStripeWebhookEventsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_developer_can_list_stripe_webhook_events(): void
    {
        $now = now();
        DB::table('stripe_webhook_events')->insert([
            'id' => 'evt_api_list_1',
            'type' => 'invoice.paid',
            'received_at' => $now,
            'processed_at' => $now,
            'processing_state' => 'processed',
            'last_error' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $dev = User::factory()->create([
            'role' => UserRole::Developer,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $dev->id)
            ->getJson('/api/admin/stripe-webhook-events')
            ->assertOk()
            ->assertJsonPath('data.items.0.id', 'evt_api_list_1')
            ->assertJsonPath('data.items.0.type', 'invoice.paid');
    }

    public function test_non_developer_forbidden(): void
    {
        Config::set('stripe.webhook_secret', 'ignored');

        $admin = User::factory()->create([
            'role' => UserRole::Admin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->getJson('/api/admin/stripe-webhook-events')
            ->assertForbidden();
    }
}
