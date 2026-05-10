<?php

declare(strict_types=1);

namespace App\Support\Costs;

use App\Models\CostImportRow;

final class CostImportRowJson
{
    /** @return array<string, mixed> */
    public static function preview(CostImportRow $row): array
    {
        return [
            'id' => (string) $row->id,
            'sheet_name' => $row->sheet_name,
            'row_number' => (int) $row->row_number,
            'raw_data' => $row->raw_data,
            'mapped_data' => $row->mapped_data,
            'preview_action' => $row->preview_action->value,
            'applied_action' => $row->applied_action?->value,
            'error_message' => $row->error_message,
        ];
    }
}
