<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Jobs\DeliverEmailNotificationJob;
use App\Models\NotificationDelivery;
use Illuminate\Database\QueryException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Central entrypoint for outbound notifications (email-first).
 * Guarantees idempotency when an idempotency key is provided.
 */
final class NotificationService
{
    /**
     * @param  array{
     *   company_id?: string|null,
     *   recipient_user_id?: int|null,
     *   recipient_email?: string|null,
     *   recipient_name?: string|null,
     *   source_type?: string|null,
     *   source_id?: string|null,
     *   meta?: array<string, mixed>|null,
     * }  $ctx
     */
    public function queueEmail(
        string $type,
        ?string $idempotencyKey,
        string $subject,
        string $view,
        array $viewData,
        array $ctx = [],
    ): NotificationDelivery {
        if ($idempotencyKey !== null && $idempotencyKey !== '') {
            $existing = NotificationDelivery::query()
                ->where('channel', 'email')
                ->where('type', $type)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing instanceof NotificationDelivery) {
                return $existing;
            }
        }

        $enabled = (bool) Config::get('notifications.enabled', false);
        $queue = (bool) Config::get('notifications.email.queue', true);
        $queueName = (string) Config::get('notifications.email.queue_name', 'notifications');

        // Always record a delivery row, even when disabled.
        $delivery = $this->createDeliveryRow(
            channel: 'email',
            type: $type,
            idempotencyKey: $idempotencyKey,
            ctx: $ctx,
            status: $enabled ? ($queue ? 'queued' : 'sent') : 'skipped',
            meta: [
                'subject' => $subject,
                'view' => $view,
                // Never store full data payloads (may contain internal notes / secrets).
                'data_keys' => array_values(array_map('strval', array_keys($viewData))),
            ],
            failureReason: $enabled ? null : 'Notifications disabled by configuration.',
            queuedAt: $enabled && $queue ? now() : null,
            sentAt: $enabled && ! $queue ? now() : null,
        );

        if (! $enabled) {
            return $delivery;
        }

        if ($queue) {
            DeliverEmailNotificationJob::dispatch($delivery->id, $subject, $view, $viewData)
                ->onQueue($queueName);

            return $delivery;
        }

        // Synchronous delivery (rare; mainly for CLI/admin).
        app(EmailDelivery::class)->sendNow($delivery->fresh(), $subject, $view, $viewData);

        return $delivery->fresh();
    }

    /**
     * Record a delivery row without attempting to send (eg. missing recipient, placeholder jobs).
     *
     * @param  array<string, mixed>|null  $meta
     * @param  array{
     *   company_id?: string|null,
     *   recipient_user_id?: int|null,
     *   recipient_email?: string|null,
     *   recipient_name?: string|null,
     *   source_type?: string|null,
     *   source_id?: string|null,
     *   meta?: array<string, mixed>|null,
     * }  $ctx
     */
    public function recordEmailDelivery(
        string $type,
        ?string $idempotencyKey,
        array $ctx,
        string $status,
        ?string $failureReason = null,
        ?array $meta = null,
    ): NotificationDelivery {
        return $this->createDeliveryRow(
            channel: 'email',
            type: $type,
            idempotencyKey: $idempotencyKey,
            ctx: $ctx,
            status: $status,
            meta: $meta,
            failureReason: $failureReason,
            queuedAt: null,
            sentAt: null,
            failedAt: $status === 'failed' ? now() : null,
        );
    }

    /**
     * @param  array<string, mixed>|null  $meta
     * @param  array{
     *   company_id?: string|null,
     *   recipient_user_id?: int|null,
     *   recipient_email?: string|null,
     *   recipient_name?: string|null,
     *   source_type?: string|null,
     *   source_id?: string|null,
     *   meta?: array<string, mixed>|null,
     * }  $ctx
     */
    private function createDeliveryRow(
        string $channel,
        string $type,
        ?string $idempotencyKey,
        array $ctx,
        string $status,
        ?array $meta,
        ?string $failureReason,
        $queuedAt,
        $sentAt,
        $failedAt = null,
    ): NotificationDelivery {
        $ctxMeta = Arr::get($ctx, 'meta');
        if (is_array($ctxMeta)) {
            $meta = array_merge($ctxMeta, $meta ?? []);
        }

        $payload = [
            'company_id' => Arr::get($ctx, 'company_id'),
            'recipient_user_id' => Arr::get($ctx, 'recipient_user_id'),
            'recipient_email' => Arr::get($ctx, 'recipient_email'),
            'recipient_name' => Arr::get($ctx, 'recipient_name'),
            'channel' => $channel,
            'type' => $type,
            'source_type' => Arr::get($ctx, 'source_type'),
            'source_id' => Arr::get($ctx, 'source_id'),
            'status' => $status,
            'idempotency_key' => $idempotencyKey !== null && $idempotencyKey !== '' ? $idempotencyKey : null,
            'queued_at' => $queuedAt,
            'sent_at' => $sentAt,
            'failed_at' => $failedAt,
            'failure_reason' => $failureReason,
            'meta' => $meta,
        ];

        // If no idempotency key, always insert a new row.
        if (($payload['idempotency_key'] ?? null) === null) {
            return NotificationDelivery::query()->create($payload);
        }

        try {
            return DB::transaction(function () use ($payload, $channel, $type): NotificationDelivery {
                // First check to return existing delivery (exact idempotency match).
                $existing = NotificationDelivery::query()
                    ->where('channel', $channel)
                    ->where('type', $type)
                    ->where('idempotency_key', $payload['idempotency_key'])
                    ->first();
                if ($existing instanceof NotificationDelivery) {
                    return $existing;
                }

                return NotificationDelivery::query()->create($payload);
            }, 3);
        } catch (QueryException $e) {
            // Race: unique index hit; return existing.
            $existing = NotificationDelivery::query()
                ->where('channel', $channel)
                ->where('type', $type)
                ->where('idempotency_key', $payload['idempotency_key'])
                ->first();
            if ($existing instanceof NotificationDelivery) {
                return $existing;
            }

            throw $e;
        }
    }

    public static function idempotencyKey(string $type, string $sourceType, string $sourceId, ?string $salt = null): string
    {
        $base = $type.'|'.$sourceType.'|'.$sourceId.($salt ? '|'.$salt : '');

        return Str::lower(hash('sha256', $base));
    }
}
