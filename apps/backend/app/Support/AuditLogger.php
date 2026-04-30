<?php

namespace App\Support;

use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\Log;

/**
 * Structural audit-log hook. Populate with persisted audit records when domains exist.
 */
final class AuditLogger
{
    /** @param  array<string, mixed>  $context */
    public static function placeholder(string $action, array $context = []): void
    {
        Log::debug('audit.placeholder', [
            'action' => $action,
            'request_id' => Context::get('request_id'),
            'context' => $context,
        ]);
    }
}
