<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\NotificationDelivery;
use App\Services\Notifications\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class NotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_disabled_notifications_are_skipped_and_logged(): void
    {
        Config::set('notifications.enabled', false);

        $svc = app(NotificationService::class);

        $d = $svc->queueEmail(
            type: 'test.ping',
            idempotencyKey: 'abc',
            subject: 'Test',
            view: 'emails.notifications.generic',
            viewData: ['headline' => 'Ping', 'body' => 'Hello'],
            ctx: ['recipient_email' => 'test@example.test'],
        );

        self::assertSame('skipped', $d->status);
        self::assertTrue(NotificationDelivery::query()->where('type', 'test.ping')->exists());
    }

    public function test_idempotency_returns_same_delivery_row(): void
    {
        Config::set('notifications.enabled', false);

        $svc = app(NotificationService::class);

        $a = $svc->queueEmail(
            type: 'test.same',
            idempotencyKey: 'same-key',
            subject: 'Test',
            view: 'emails.notifications.generic',
            viewData: ['headline' => 'A', 'body' => 'B'],
            ctx: ['recipient_email' => 'test@example.test'],
        );
        $b = $svc->queueEmail(
            type: 'test.same',
            idempotencyKey: 'same-key',
            subject: 'Test',
            view: 'emails.notifications.generic',
            viewData: ['headline' => 'A', 'body' => 'B'],
            ctx: ['recipient_email' => 'test@example.test'],
        );

        self::assertSame((string) $a->id, (string) $b->id);
        self::assertSame(1, NotificationDelivery::query()->where('type', 'test.same')->count());
    }

    public function test_enabled_non_queued_sends_email_and_logs_sent(): void
    {
        Mail::fake();

        Config::set('notifications.enabled', true);
        Config::set('notifications.email.queue', false);

        $svc = app(NotificationService::class);

        $d = $svc->queueEmail(
            type: 'test.send',
            idempotencyKey: 'send-key',
            subject: 'Test subject',
            view: 'emails.notifications.generic',
            viewData: ['headline' => 'Hello', 'body' => 'World'],
            ctx: ['recipient_email' => 'test@example.test'],
        );

        $d->refresh();
        self::assertSame('sent', $d->status);
        self::assertNotNull($d->sent_at);

        Mail::assertSentCount(1);
    }
}
