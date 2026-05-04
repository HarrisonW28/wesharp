<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Single-row Stripe integration overrides. Secrets use Eloquent {@see $casts} encryption (APP_KEY).
 * Null column values mean “use environment / config fallback”.
 */
final class StripeSetting extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'secret_key' => 'encrypted',
            'public_key' => 'encrypted',
            'webhook_secret' => 'encrypted',
            'hosted_checkout_enabled' => 'boolean',
            'allow_live' => 'boolean',
        ];
    }

    public static function current(): self
    {
        $row = self::query()->first();
        if ($row !== null) {
            return $row;
        }

        $row = new self;
        $row->save();

        return $row;
    }
}
