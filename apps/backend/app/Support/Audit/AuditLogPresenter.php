<?php

declare(strict_types=1);

namespace App\Support\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Normalises audit rows for admin APIs (labels, redaction, safe diff hints).
 */
final class AuditLogPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function toArray(AuditLog $row, bool $includeIp = true): array
    {
        $payload = AuditPayloadRedactor::redact($row->payload ?? []);
        $actor = $row->relationLoaded('actor') ? $row->actor : null;

        return [
            'id' => (string) $row->id,
            'at' => $row->created_at?->toIso8601String(),
            'action' => $row->action,
            'action_label' => AuditActionLabels::label((string) $row->action),
            'actor' => [
                'id' => $row->actor_id !== null ? (string) $row->actor_id : null,
                'name' => $actor instanceof User ? $actor->name : null,
                'email' => $actor instanceof User ? $actor->email : null,
            ],
            'subject_type' => self::subjectShort((string) $row->auditable_type),
            'subject_id' => (string) $row->auditable_id,
            'payload' => $payload,
            'changed_fields' => self::changedFields($payload),
            'ip_address' => $includeIp ? $row->ip_address : null,
            'request_id' => $row->request_id,
        ];
    }

    /**
     * @param  iterable<AuditLog>  $rows
     * @return list<array<string, mixed>>
     */
    public static function mapTimeline(iterable $rows, bool $includeIp = true): array
    {
        $out = [];
        foreach ($rows as $row) {
            $out[] = self::toArray($row, $includeIp);
        }

        return $out;
    }

    /** @param  array<string, mixed>  $payload */
    private static function changedFields(array $payload): ?array
    {
        $before = $payload['before'] ?? null;
        $after = $payload['after'] ?? null;
        if (! is_array($before) || ! is_array($after)) {
            return null;
        }
        $keys = array_values(array_unique([...array_keys($before), ...array_keys($after)]));
        $changed = [];
        foreach ($keys as $key) {
            if (strtolower((string) $key) === 'password') {
                continue;
            }
            $b = $before[$key] ?? null;
            $a = $after[$key] ?? null;
            if ($b !== $a) {
                $changed[] = (string) $key;
            }
        }

        return $changed !== [] ? $changed : null;
    }

    private static function subjectShort(string $auditableType): string
    {
        if ($auditableType === '' || ! str_contains($auditableType, '\\')) {
            return 'unknown';
        }

        $short = Str::afterLast($auditableType, '\\');

        return Str::snake($short);
    }
}
