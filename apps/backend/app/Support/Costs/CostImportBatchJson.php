<?php

declare(strict_types=1);

namespace App\Support\Costs;

use App\Models\CostImportBatch;
use App\Models\User;

final class CostImportBatchJson
{
    /** @return array<string, mixed> */
    public static function summary(CostImportBatch $batch): array
    {
        $row = [
            'id' => (string) $batch->id,
            'type' => $batch->type,
            'filename' => $batch->filename,
            'status' => $batch->status->value,
            'rows_detected' => (int) $batch->rows_detected,
            'rows_created' => (int) $batch->rows_created,
            'rows_updated' => (int) $batch->rows_updated,
            'rows_skipped' => (int) $batch->rows_skipped,
            'warnings' => $batch->warnings_json,
            'errors' => $batch->errors_json,
            'cash_snapshot' => $batch->cash_snapshot_json,
            'auxiliary_sheets' => $batch->auxiliary_sheets_json,
            'started_at' => $batch->started_at?->toIso8601String(),
            'completed_at' => $batch->completed_at?->toIso8601String(),
            'created_at' => $batch->created_at?->toIso8601String(),
            'uploaded_by' => null,
        ];

        if ($batch->relationLoaded('uploadedBy') && $batch->uploadedBy instanceof User) {
            $row['uploaded_by'] = [
                'id' => (string) $batch->uploadedBy->id,
                'email' => $batch->uploadedBy->email,
                'name' => $batch->uploadedBy->name,
            ];
        }

        return $row;
    }
}
