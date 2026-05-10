<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CostImportBatchStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CostImportBatch extends Model
{
    use HasUuids;

    protected $fillable = [
        'type',
        'filename',
        'disk_path',
        'uploaded_by_user_id',
        'status',
        'rows_detected',
        'rows_created',
        'rows_updated',
        'rows_skipped',
        'warnings_json',
        'errors_json',
        'cash_snapshot_json',
        'auxiliary_sheets_json',
        'started_at',
        'completed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => CostImportBatchStatus::class,
            'rows_detected' => 'integer',
            'rows_created' => 'integer',
            'rows_updated' => 'integer',
            'rows_skipped' => 'integer',
            'warnings_json' => 'array',
            'errors_json' => 'array',
            'cash_snapshot_json' => 'array',
            'auxiliary_sheets_json' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function rows(): HasMany
    {
        return $this->hasMany(CostImportRow::class, 'cost_import_batch_id');
    }
}
