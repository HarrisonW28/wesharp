<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CostImportAppliedAction;
use App\Enums\CostImportPreviewAction;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CostImportRow extends Model
{
    use HasUuids;

    protected $fillable = [
        'cost_import_batch_id',
        'sheet_name',
        'row_number',
        'raw_data',
        'mapped_data',
        'preview_action',
        'applied_action',
        'error_message',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'raw_data' => 'array',
            'mapped_data' => 'array',
            'preview_action' => CostImportPreviewAction::class,
            'applied_action' => CostImportAppliedAction::class,
            'row_number' => 'integer',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(CostImportBatch::class, 'cost_import_batch_id');
    }
}
