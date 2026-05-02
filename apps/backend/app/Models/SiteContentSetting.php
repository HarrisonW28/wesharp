<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'overrides',
])]
final class SiteContentSetting extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'overrides' => 'array',
        ];
    }

    public static function current(): self
    {
        /** @var self $row */
        $row = self::query()->firstOrCreate([], ['overrides' => []]);

        return $row;
    }
}
