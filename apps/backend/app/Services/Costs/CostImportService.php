<?php

declare(strict_types=1);

namespace App\Services\Costs;

use App\Enums\CostFrequency;
use App\Enums\CostImportAppliedAction;
use App\Enums\CostImportBatchStatus;
use App\Enums\CostImportPreviewAction;
use App\Enums\CostStatus;
use App\Models\CostCategory;
use App\Models\CostImportBatch;
use App\Models\CostImportRow;
use App\Models\CostItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as SpreadsheetDate;
use Throwable;

final class CostImportService
{
    private const DISK = 'local';

    private const STORAGE_DIR = 'cost-imports';

    /**
     * @return array<string, array<int, array<int, mixed|null>>>
     */
    private function workbookToSheetMatrices(string $absolutePath): array
    {
        $spreadsheet = IOFactory::load($absolutePath);
        $out = [];
        foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
            $out[$worksheet->getTitle()] = $worksheet->toArray();
        }

        return $out;
    }

    public function handleUpload(UploadedFile $file, User $user): CostImportBatch
    {
        $batch = CostImportBatch::query()->create([
            'type' => 'costs_workbook',
            'filename' => $file->getClientOriginalName(),
            'uploaded_by_user_id' => $user->id,
            'status' => CostImportBatchStatus::Parsing,
            'started_at' => now(),
        ]);

        $safeExt = strtolower($file->getClientOriginalExtension() ?: 'bin');
        $safeExt = in_array($safeExt, ['xlsx', 'xls', 'csv'], true) ? $safeExt : 'xlsx';
        $relative = self::STORAGE_DIR.'/'.$batch->id.'/source.'.$safeExt;

        Storage::disk(self::DISK)->makeDirectory(self::STORAGE_DIR.'/'.$batch->id);
        $file->storeAs(self::STORAGE_DIR.'/'.$batch->id, 'source.'.$safeExt, ['disk' => self::DISK]);

        $batch->disk_path = $relative;
        $batch->save();

        $absolute = Storage::disk(self::DISK)->path($relative);

        try {
            $sheets = $this->workbookToSheetMatrices($absolute);
        } catch (Throwable $e) {
            $batch->errors_json = [['message' => 'Could not read workbook.', 'detail' => $e->getMessage()]];
            $batch->status = CostImportBatchStatus::Failed;
            $batch->completed_at = now();
            $batch->save();

            return $batch;
        }

        $warnings = [];
        $errors = [];
        $cashSnapshot = [];
        $auxiliary = [];

        DB::transaction(function () use ($batch, $sheets, &$warnings, &$errors, &$cashSnapshot, &$auxiliary): void {
            foreach ($sheets as $sheetTitle => $matrix) {
                $slug = $this->normalizeSheetKey((string) $sheetTitle);

                if (str_contains($slug, 'consumable')) {
                    $this->ingestConsumablesSheet($batch, (string) $sheetTitle, $matrix, $warnings, $errors);
                } elseif (str_contains($slug, 'cash')) {
                    $snap = $this->extractCashPosition($matrix);
                    if ($snap !== []) {
                        $cashSnapshot = array_merge($cashSnapshot, $snap);
                    }
                } elseif (str_contains($slug, 'serrated')) {
                    $auxiliary['serrated_research'] = $this->flattenSheetAsText($matrix);
                } elseif (str_contains($slug, 'howtouse')) {
                    $auxiliary['how_to_use'] = $this->flattenSheetAsText($matrix);
                } elseif (
                    $slug === 'costplan'
                    || str_contains($slug, 'costplan')
                    || $this->looksLikeCostPlanSheet($matrix)
                ) {
                    $this->ingestCostPlanSheet($batch, (string) $sheetTitle, $matrix, $warnings, $errors);
                }
            }

            if ($batch->rows()->count() === 0 && $cashSnapshot === [] && $auxiliary === []) {
                $errors[] = ['message' => 'No importable rows detected. Expected a “Cost Plan” or consumables sheet with recognised headers.'];
            }

            $batch->warnings_json = $warnings !== [] ? $warnings : null;
            $batch->errors_json = $errors !== [] ? $errors : null;
            $batch->cash_snapshot_json = $cashSnapshot !== [] ? $cashSnapshot : null;
            $batch->auxiliary_sheets_json = $auxiliary !== [] ? $auxiliary : null;

            $batch->rows_detected = $batch->rows()->count();
            $batch->status = $errors !== [] && $batch->rows_detected === 0
                ? CostImportBatchStatus::Failed
                : CostImportBatchStatus::PreviewReady;
            $batch->completed_at = now();
            $batch->save();
        });

        return $batch->fresh(['rows']);
    }

    public function commitBatch(CostImportBatch $batch, User $user): CostImportBatch
    {
        if ($batch->status !== CostImportBatchStatus::PreviewReady) {
            throw new \InvalidArgumentException('Batch is not awaiting commit.');
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = 0;

        DB::transaction(function () use ($batch, $user, &$created, &$updated, &$skipped, &$errors): void {
            foreach ($batch->rows()->orderBy('sheet_name')->orderBy('row_number')->cursor() as $row) {
                /** @var CostImportRow $row */
                if ($row->preview_action === CostImportPreviewAction::WouldSkip) {
                    $row->applied_action = CostImportAppliedAction::Skipped;
                    $row->save();
                    $skipped++;

                    continue;
                }

                if ($row->preview_action === CostImportPreviewAction::Invalid || ! is_array($row->mapped_data)) {
                    $row->applied_action = CostImportAppliedAction::Error;
                    $row->error_message ??= 'Invalid preview row.';
                    $row->save();
                    $errors++;

                    continue;
                }

                $data = $row->mapped_data;

                try {
                    if ($row->preview_action === CostImportPreviewAction::WouldCreate) {
                        CostItem::query()->create($this->payloadForModel($data, $user, $row, false));
                        $row->applied_action = CostImportAppliedAction::Created;
                        $created++;
                    } elseif ($row->preview_action === CostImportPreviewAction::WouldUpdate) {
                        $id = $data['existing_cost_item_id'] ?? null;
                        if (! is_string($id) || $id === '') {
                            throw new \RuntimeException('Missing existing_cost_item_id for update.');
                        }
                        $item = CostItem::query()->findOrFail($id);
                        $item->fill($this->payloadForModel($data, $user, $row, true));
                        $item->save();
                        $row->applied_action = CostImportAppliedAction::Updated;
                        $updated++;
                    }
                } catch (Throwable $e) {
                    $row->applied_action = CostImportAppliedAction::Error;
                    $row->error_message = $e->getMessage();
                    $errors++;
                }

                $row->save();
            }

            $batch->rows_created = $created;
            $batch->rows_updated = $updated;
            $batch->rows_skipped = $skipped;
            $batch->status = CostImportBatchStatus::Committed;
            $batch->completed_at = now();

            if ($batch->disk_path) {
                Storage::disk(self::DISK)->deleteDirectory(dirname($batch->disk_path));
                $batch->disk_path = null;
            }

            $batch->save();
        });

        return $batch->fresh(['rows']);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function payloadForModel(array $data, User $user, CostImportRow $row, bool $isUpdate): array
    {
        $frequency = CostFrequency::from((string) $data['frequency']);
        $status = CostStatus::from((string) $data['status']);

        $payload = [
            'category_id' => (string) $data['category_id'],
            'tier_label' => isset($data['tier_label']) && is_string($data['tier_label']) && $data['tier_label'] !== '' ? $data['tier_label'] : null,
            'name' => (string) $data['name'],
            'description' => isset($data['description']) && is_string($data['description']) ? $data['description'] : null,
            'amount_pence' => (int) $data['amount_pence'],
            'currency' => 'GBP',
            'frequency' => $frequency,
            'status' => $status,
            'priority' => isset($data['priority']) ? (int) $data['priority'] : 0,
            'notes' => isset($data['notes']) && is_string($data['notes']) ? $data['notes'] : null,
            'is_recurring' => (bool) ($data['is_recurring'] ?? $frequency->isRecurring()),
            'is_consumable' => (bool) ($data['is_consumable'] ?? false),
            'source' => 'import',
            'source_sheet' => $row->sheet_name,
            'source_row' => $row->row_number,
            'updated_by_user_id' => $user->id,
        ];

        foreach (['supplier_name', 'supplier_url', 'payment_method_note'] as $stringKey) {
            if (! array_key_exists($stringKey, $data)) {
                continue;
            }
            $v = $data[$stringKey];
            $payload[$stringKey] = is_string($v) && $v !== '' ? $v : null;
        }

        foreach (['starts_on', 'ends_on', 'next_due_on', 'renews_on'] as $dateKey) {
            if (! array_key_exists($dateKey, $data)) {
                continue;
            }
            $v = $data[$dateKey];
            $payload[$dateKey] = is_string($v) && $v !== '' ? $v : null;
        }

        if (array_key_exists('commitment_cancellable', $data)) {
            $payload['commitment_cancellable'] = (bool) $data['commitment_cancellable'];
        }

        if (! $isUpdate) {
            $payload['is_seeded'] = false;
            $payload['seed_key'] = null;
            $payload['created_by_user_id'] = $user->id;
        }

        return $payload;
    }

    /**
     * @param  array<int, array<int, mixed|null>>  $matrix
     */
    private function looksLikeCostPlanSheet(array $matrix): bool
    {
        return $this->detectCostPlanHeaderRow($matrix) !== null;
    }

    /**
     * @param  array<int, array<int, mixed|null>>  $matrix
     */
    private function normalizeSheetKey(string $title): string
    {
        return strtolower(preg_replace('/\s+/', '', $title) ?? '');
    }

    /**
     * @param  array<int, array<int, mixed|null>>  $matrix
     * @param  list<string>  $warnings
     * @param  list<array{message:string}>  $errors
     */
    private function ingestCostPlanSheet(
        CostImportBatch $batch,
        string $sheetTitle,
        array $matrix,
        array &$warnings,
        array &$errors,
    ): void {
        $headerIdx = $this->detectCostPlanHeaderRow($matrix);
        if ($headerIdx === null) {
            $warnings[] = sprintf('Skipped sheet "%s": no Cost Plan header row found.', $sheetTitle);

            return;
        }

        $colMap = $this->mapCostPlanHeaders($matrix[$headerIdx] ?? []);
        if (! isset($colMap['item'], $colMap['cost'])) {
            $errors[] = ['message' => sprintf('Sheet "%s": missing required columns (need Item and Cost).', $sheetTitle)];

            return;
        }

        $categoryFallback = $this->categoryIdBySlug('other');

        $maxRow = count($matrix);
        for ($r = $headerIdx + 1; $r < $maxRow; $r++) {
            $rowArr = $matrix[$r] ?? [];
            $excelRow = $r + 1;
            $item = $this->stringCell($rowArr[$colMap['item']] ?? null);
            $tier = isset($colMap['tier']) ? $this->stringCell($rowArr[$colMap['tier']] ?? null) : null;

            $raw = [
                'tier' => $tier,
                'item' => $item,
                'cost' => $rowArr[$colMap['cost']] ?? null,
                'frequency' => isset($colMap['frequency']) ? $rowArr[$colMap['frequency']] ?? null : null,
                'status' => isset($colMap['status']) ? $rowArr[$colMap['status']] ?? null : null,
                'notes' => isset($colMap['notes']) ? $rowArr[$colMap['notes']] ?? null : null,
            ];
            if (isset($colMap['category'])) {
                $raw['category'] = $rowArr[$colMap['category']] ?? null;
            }
            if (isset($colMap['supplier_name'])) {
                $raw['supplier_name'] = $rowArr[$colMap['supplier_name']] ?? null;
            }
            if (isset($colMap['supplier_url'])) {
                $raw['supplier_url'] = $rowArr[$colMap['supplier_url']] ?? null;
            }
            if (isset($colMap['next_due_on'])) {
                $raw['next_due_on'] = $rowArr[$colMap['next_due_on']] ?? null;
            }
            if (isset($colMap['renews_on'])) {
                $raw['renews_on'] = $rowArr[$colMap['renews_on']] ?? null;
            }
            if (isset($colMap['payment_method_note'])) {
                $raw['payment_method_note'] = $rowArr[$colMap['payment_method_note']] ?? null;
            }
            if (isset($colMap['commitment_cancellable'])) {
                $raw['commitment_cancellable'] = $rowArr[$colMap['commitment_cancellable']] ?? null;
            }

            if ($this->shouldSkipCostPlanLabel($item)) {
                CostImportRow::query()->create([
                    'cost_import_batch_id' => $batch->id,
                    'sheet_name' => $sheetTitle,
                    'row_number' => $excelRow,
                    'raw_data' => $raw,
                    'mapped_data' => null,
                    'preview_action' => CostImportPreviewAction::WouldSkip,
                ]);

                continue;
            }

            $amount = $this->parseAmountPence($rowArr[$colMap['cost']] ?? null);
            if ($amount === null) {
                CostImportRow::query()->create([
                    'cost_import_batch_id' => $batch->id,
                    'sheet_name' => $sheetTitle,
                    'row_number' => $excelRow,
                    'raw_data' => $raw,
                    'mapped_data' => null,
                    'preview_action' => CostImportPreviewAction::Invalid,
                    'error_message' => 'Cost is missing or not numeric.',
                ]);

                continue;
            }

            $freqLabel = isset($colMap['frequency']) ? $this->stringCell($rowArr[$colMap['frequency']] ?? null) : null;
            $frequency = CostFrequency::tryFromCostPlanLabel($freqLabel);
            if ($frequency === null) {
                CostImportRow::query()->create([
                    'cost_import_batch_id' => $batch->id,
                    'sheet_name' => $sheetTitle,
                    'row_number' => $excelRow,
                    'raw_data' => $raw,
                    'mapped_data' => null,
                    'preview_action' => CostImportPreviewAction::Invalid,
                    'error_message' => sprintf('Unknown frequency "%s".', (string) $freqLabel),
                ]);

                continue;
            }

            $statusLabel = isset($colMap['status']) ? $this->stringCell($rowArr[$colMap['status']] ?? null) : null;
            $status = CostStatus::tryFromCostPlanLabel($statusLabel);
            if ($status === null) {
                CostImportRow::query()->create([
                    'cost_import_batch_id' => $batch->id,
                    'sheet_name' => $sheetTitle,
                    'row_number' => $excelRow,
                    'raw_data' => $raw,
                    'mapped_data' => null,
                    'preview_action' => CostImportPreviewAction::Invalid,
                    'error_message' => sprintf('Unknown status "%s".', (string) $statusLabel),
                ]);

                continue;
            }

            $categoryLabel = isset($colMap['category'])
                ? $this->stringCell($rowArr[$colMap['category']] ?? null)
                : null;
            $categoryId = $this->resolveCostCategoryIdFromLabel($categoryLabel, $categoryFallback);

            $supplierName = isset($colMap['supplier_name'])
                ? $this->stringCell($rowArr[$colMap['supplier_name']] ?? null)
                : null;
            $supplierUrl = isset($colMap['supplier_url'])
                ? $this->stringCell($rowArr[$colMap['supplier_url']] ?? null)
                : null;
            $nextDueOn = isset($colMap['next_due_on'])
                ? $this->parseDateCell($rowArr[$colMap['next_due_on']] ?? null)
                : null;
            $renewsOn = isset($colMap['renews_on'])
                ? $this->parseDateCell($rowArr[$colMap['renews_on']] ?? null)
                : null;
            $paymentMethodNote = isset($colMap['payment_method_note'])
                ? $this->stringCell($rowArr[$colMap['payment_method_note']] ?? null)
                : null;
            $commitmentCancellable = isset($colMap['commitment_cancellable'])
                ? $this->parseBoolCell($rowArr[$colMap['commitment_cancellable']] ?? null)
                : null;

            $notes = isset($colMap['notes']) ? $this->stringCell($rowArr[$colMap['notes']] ?? null) : null;

            $existing = $this->findMatchingCostItem($sheetTitle, $excelRow, $item, $tier, $frequency);

            $mapped = [
                'category_id' => $categoryId,
                'tier_label' => $tier !== '' ? $tier : null,
                'name' => $item,
                'amount_pence' => $amount,
                'frequency' => $frequency->value,
                'status' => $status->value,
                'notes' => $notes !== '' ? $notes : null,
                'is_consumable' => false,
                'is_recurring' => $frequency->isRecurring(),
            ];

            if ($supplierName !== null && $supplierName !== '') {
                $mapped['supplier_name'] = $supplierName;
            }
            if ($supplierUrl !== null && $supplierUrl !== '') {
                $mapped['supplier_url'] = $supplierUrl;
            }
            if ($nextDueOn !== null) {
                $mapped['next_due_on'] = $nextDueOn;
            }
            if ($renewsOn !== null) {
                $mapped['renews_on'] = $renewsOn;
            }
            if ($paymentMethodNote !== null && $paymentMethodNote !== '') {
                $mapped['payment_method_note'] = $paymentMethodNote;
            }
            if ($commitmentCancellable !== null) {
                $mapped['commitment_cancellable'] = $commitmentCancellable;
            }

            if ($existing !== null) {
                $mapped['existing_cost_item_id'] = $existing->id;
            }

            CostImportRow::query()->create([
                'cost_import_batch_id' => $batch->id,
                'sheet_name' => $sheetTitle,
                'row_number' => $excelRow,
                'raw_data' => $raw,
                'mapped_data' => $mapped,
                'preview_action' => $existing !== null ? CostImportPreviewAction::WouldUpdate : CostImportPreviewAction::WouldCreate,
            ]);
        }
    }

    /**
     * @param  array<int, array<int, mixed|null>>  $matrix
     * @param  list<string>  $warnings
     * @param  list<array{message:string}>  $errors
     */
    private function ingestConsumablesSheet(
        CostImportBatch $batch,
        string $sheetTitle,
        array $matrix,
        array &$warnings,
        array &$errors,
    ): void {
        $headerIdx = $this->detectConsumablesHeaderRow($matrix);
        if ($headerIdx === null) {
            $warnings[] = sprintf('Skipped sheet "%s": consumables headers not found.', $sheetTitle);

            return;
        }

        $colMap = $this->mapConsumablesHeaders($matrix[$headerIdx] ?? []);
        if (! isset($colMap['item'], $colMap['cost'])) {
            $errors[] = ['message' => sprintf('Sheet "%s": consumables need Item and Cost columns.', $sheetTitle)];

            return;
        }

        $categoryId = $this->categoryIdBySlug('consumables_and_spares');
        $frequency = CostFrequency::OneTime;

        $maxRow = count($matrix);
        for ($r = $headerIdx + 1; $r < $maxRow; $r++) {
            $rowArr = $matrix[$r] ?? [];
            $excelRow = $r + 1;
            $item = $this->stringCell($rowArr[$colMap['item']] ?? null);

            if ($this->normLabel($item) === '') {
                CostImportRow::query()->create([
                    'cost_import_batch_id' => $batch->id,
                    'sheet_name' => $sheetTitle,
                    'row_number' => $excelRow,
                    'raw_data' => ['item' => $item],
                    'mapped_data' => null,
                    'preview_action' => CostImportPreviewAction::WouldSkip,
                ]);

                continue;
            }

            $amount = $this->parseAmountPence($rowArr[$colMap['cost']] ?? null);
            if ($amount === null) {
                CostImportRow::query()->create([
                    'cost_import_batch_id' => $batch->id,
                    'sheet_name' => $sheetTitle,
                    'row_number' => $excelRow,
                    'raw_data' => ['item' => $item],
                    'mapped_data' => null,
                    'preview_action' => CostImportPreviewAction::Invalid,
                    'error_message' => 'Cost is missing or not numeric.',
                ]);

                continue;
            }

            $stock = isset($colMap['stock']) ? $this->stringCell($rowArr[$colMap['stock']] ?? null) : '';
            $lastReorder = isset($colMap['last_reorder']) ? $this->stringCell($rowArr[$colMap['last_reorder']] ?? null) : '';
            $reorderAt = isset($colMap['reorder_at']) ? $this->stringCell($rowArr[$colMap['reorder_at']] ?? null) : '';
            $notesCell = isset($colMap['notes']) ? $this->stringCell($rowArr[$colMap['notes']] ?? null) : '';

            $parts = array_filter([
                $stock !== '' ? 'Stock: '.$stock : null,
                $lastReorder !== '' ? 'Last reorder: '.$lastReorder : null,
                $reorderAt !== '' ? 'Reorder at: '.$reorderAt : null,
                $notesCell !== '' ? $notesCell : null,
            ]);
            $mergedNotes = $parts !== [] ? implode(' · ', $parts) : null;

            $supplierName = isset($colMap['supplier_name'])
                ? $this->stringCell($rowArr[$colMap['supplier_name']] ?? null)
                : null;

            $existing = $this->findMatchingCostItem($sheetTitle, $excelRow, $item, null, $frequency);

            $mapped = [
                'category_id' => $categoryId,
                'tier_label' => null,
                'name' => $item,
                'amount_pence' => $amount,
                'frequency' => $frequency->value,
                'status' => CostStatus::Active->value,
                'notes' => $mergedNotes,
                'is_consumable' => true,
                'is_recurring' => false,
            ];

            if ($supplierName !== null && $supplierName !== '') {
                $mapped['supplier_name'] = $supplierName;
            }

            if ($existing !== null) {
                $mapped['existing_cost_item_id'] = $existing->id;
            }

            CostImportRow::query()->create([
                'cost_import_batch_id' => $batch->id,
                'sheet_name' => $sheetTitle,
                'row_number' => $excelRow,
                'raw_data' => [
                    'item' => $item,
                    'cost' => $rowArr[$colMap['cost']] ?? null,
                    'stock' => $stock,
                    'last_reorder' => $lastReorder,
                    'reorder_at' => $reorderAt,
                    'notes' => $notesCell,
                    'supplier_name' => isset($colMap['supplier_name']) ? ($rowArr[$colMap['supplier_name']] ?? null) : null,
                ],
                'mapped_data' => $mapped,
                'preview_action' => $existing !== null ? CostImportPreviewAction::WouldUpdate : CostImportPreviewAction::WouldCreate,
            ]);
        }
    }

    /**
     * @param  array<int, array<int, mixed|null>>  $matrix
     * @return array<string, string>
     */
    private function extractCashPosition(array $matrix): array
    {
        $out = [];
        foreach ($matrix as $row) {
            $k = $this->stringCell($row[0] ?? null);
            $v = $this->stringCell($row[1] ?? null);
            if ($this->normLabel($k) === '' || $this->normLabel($v) === '') {
                continue;
            }
            $nk = $this->normLabel($k);
            if (strlen($nk) > 120) {
                continue;
            }
            $out[$k] = $v;
        }

        return $out;
    }

    /**
     * @param  array<int, array<int, mixed|null>>  $matrix
     */
    private function flattenSheetAsText(array $matrix): string
    {
        $lines = [];
        foreach ($matrix as $row) {
            $cells = array_map(fn ($c) => trim((string) ($c ?? '')), $row);
            $cells = array_filter($cells, fn ($c) => $c !== '');
            if ($cells !== []) {
                $lines[] = implode("\t", $cells);
            }
        }

        return implode("\n", $lines);
    }

    /**
     * @param  array<int, mixed|null>  $headerRow
     * @return array<string, int>
     */
    private function mapCostPlanHeaders(array $headerRow): array
    {
        $map = [];
        foreach ($headerRow as $idx => $cell) {
            $h = strtolower(trim((string) ($cell ?? '')));
            $h = str_replace(['£', '(£)'], '', $h);
            $h = trim($h);

            if ($h === 'tier') {
                $map['tier'] = (int) $idx;
            }
            if ($h === 'item') {
                $map['item'] = (int) $idx;
            }
            if ($h === 'category' || str_contains($h, 'category')) {
                $map['category'] = (int) $idx;
            }
            if ((str_contains($h, 'cost') || $h === 'price') && ! str_contains($h, 'category')) {
                $map['cost'] = (int) $idx;
            }
            if (str_contains($h, 'frequency')) {
                $map['frequency'] = (int) $idx;
            }
            if ($h === 'status') {
                $map['status'] = (int) $idx;
            }
            if ($h === 'notes') {
                $map['notes'] = (int) $idx;
            }
            if ($h === 'supplier url' || $h === 'supplier_url' || str_contains($h, 'supplier') && str_contains($h, 'url')) {
                $map['supplier_url'] = (int) $idx;
            } elseif (str_contains($h, 'supplier') || $h === 'vendor') {
                $map['supplier_name'] = (int) $idx;
            }
            if ((str_contains($h, 'next') && str_contains($h, 'due')) || $h === 'due date' || $h === 'next due') {
                $map['next_due_on'] = (int) $idx;
            }
            if (str_contains($h, 'renew')) {
                $map['renews_on'] = (int) $idx;
            }
            if ((str_contains($h, 'payment') && str_contains($h, 'method')) || $h === 'pay method' || $h === 'payment note') {
                $map['payment_method_note'] = (int) $idx;
            }
            if (str_contains($h, 'cancellable')) {
                $map['commitment_cancellable'] = (int) $idx;
            }
        }

        return $map;
    }

    /**
     * @param  array<int, mixed|null>  $headerRow
     * @return array<string, int>
     */
    private function mapConsumablesHeaders(array $headerRow): array
    {
        $map = [];
        foreach ($headerRow as $idx => $cell) {
            $h = strtolower(trim((string) ($cell ?? '')));
            $h = str_replace(['£', '(£)'], '', $h);
            $h = trim($h);

            if ($h === '#' || $h === 'no' || $h === 'no.') {
                $map['num'] = (int) $idx;
            }
            if ($h === 'item') {
                $map['item'] = (int) $idx;
            }
            if (str_contains($h, 'cost')) {
                $map['cost'] = (int) $idx;
            }
            if ($h === 'stock') {
                $map['stock'] = (int) $idx;
            }
            if (str_contains($h, 'last') && str_contains($h, 'reorder')) {
                $map['last_reorder'] = (int) $idx;
            }
            if (str_contains($h, 'reorder') && str_contains($h, 'at')) {
                $map['reorder_at'] = (int) $idx;
            }
            if ($h === 'notes') {
                $map['notes'] = (int) $idx;
            }
            if ($h === 'supplier url' || $h === 'supplier_url' || (str_contains($h, 'supplier') && str_contains($h, 'url'))) {
                $map['supplier_url'] = (int) $idx;
            } elseif (str_contains($h, 'supplier') || $h === 'vendor') {
                $map['supplier_name'] = (int) $idx;
            }
        }

        return $map;
    }

    /**
     * @param  array<int, array<int, mixed|null>>  $matrix
     */
    private function detectCostPlanHeaderRow(array $matrix): ?int
    {
        foreach ($matrix as $idx => $row) {
            $cells = array_map(fn ($c) => strtolower(trim((string) ($c ?? ''))), $row);
            $joined = implode('|', $cells);
            if (str_contains($joined, 'item') && (str_contains($joined, 'cost') || str_contains($joined, '£'))) {
                return $idx;
            }
        }

        return null;
    }

    /**
     * @param  array<int, array<int, mixed|null>>  $matrix
     */
    private function detectConsumablesHeaderRow(array $matrix): ?int
    {
        foreach ($matrix as $idx => $row) {
            $cells = array_map(fn ($c) => strtolower(trim((string) ($c ?? ''))), $row);
            $joined = implode('|', $cells);
            if (str_contains($joined, 'item') && str_contains($joined, 'cost')) {
                return $idx;
            }
        }

        return null;
    }

    private function findMatchingCostItem(
        string $sheetName,
        int $excelRow,
        string $name,
        ?string $tier,
        CostFrequency $frequency,
    ): ?CostItem {
        $byPriorImport = CostItem::query()
            ->where('source', 'import')
            ->where('source_sheet', $sheetName)
            ->where('source_row', $excelRow)
            ->first();

        if ($byPriorImport !== null) {
            return $byPriorImport;
        }

        $nn = $this->normLabel($name);
        $tn = $this->normLabel((string) ($tier ?? ''));

        return CostItem::query()
            ->where('frequency', $frequency)
            ->get()
            ->first(function (CostItem $c) use ($nn, $tn): bool {
                return $this->normLabel($c->name) === $nn
                    && $this->normLabel((string) ($c->tier_label ?? '')) === $tn;
            });
    }

    private function categoryIdBySlug(string $slug): string
    {
        $id = CostCategory::query()->where('slug', $slug)->value('id');
        if ($id !== null) {
            return (string) $id;
        }

        $fallback = CostCategory::query()->where('slug', 'other')->value('id');

        return $fallback !== null ? (string) $fallback : CostCategory::query()->firstOrFail()->id;
    }

    private function resolveCostCategoryIdFromLabel(?string $label, string $fallbackId): string
    {
        if ($label === null || trim($label) === '') {
            return $fallbackId;
        }

        $slugGuess = $this->normalizeCategorySlug($label);
        $bySlug = CostCategory::query()->where('slug', $slugGuess)->value('id');
        if ($bySlug !== null) {
            return (string) $bySlug;
        }

        $needle = strtolower(trim(preg_replace('/\s+/', ' ', $label) ?? ''));

        $byName = CostCategory::query()->get()->first(function (CostCategory $c) use ($needle): bool {
            return strtolower($c->name) === $needle;
        });

        return $byName !== null ? (string) $byName->id : $fallbackId;
    }

    private function normalizeCategorySlug(string $label): string
    {
        $t = strtolower(trim($label));
        $t = str_replace([' ', '-'], '_', $t);

        return preg_replace('/_+/', '_', $t) ?? $t;
    }

    private function parseDateCell(mixed $cell): ?string
    {
        if ($cell === null || $cell === '') {
            return null;
        }

        if (is_numeric($cell)) {
            $n = (float) $cell;
            if ($n > 20000) {
                try {
                    return SpreadsheetDate::excelToDateTimeObject($n)->format('Y-m-d');
                } catch (Throwable) {
                    return null;
                }
            }
        }

        $s = trim((string) $cell);
        if ($s === '') {
            return null;
        }

        try {
            return Carbon::parse($s)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    private function parseBoolCell(mixed $cell): ?bool
    {
        if ($cell === null || $cell === '') {
            return null;
        }

        if (is_bool($cell)) {
            return $cell;
        }

        $s = strtolower(trim((string) $cell));

        return match ($s) {
            '1', 'yes', 'y', 'true', 'x', 'on' => true,
            '0', 'no', 'n', 'false', 'off' => false,
            default => null,
        };
    }

    private function shouldSkipCostPlanLabel(string $item): bool
    {
        $n = $this->normLabel($item);
        if ($n === '') {
            return true;
        }

        if (preg_match('/^(subtotal|grand\s*total)\b/i', $item) === 1) {
            return true;
        }

        if (preg_match('/^total\b/i', $item) === 1) {
            return true;
        }

        if (str_contains($n, 'total one-time')) {
            return true;
        }

        if (str_contains($n, 'total weekly')) {
            return true;
        }

        if (str_contains($n, 'total monthly')) {
            return true;
        }

        return str_contains($n, 'total monthly burn');
    }

    private function parseAmountPence(mixed $cell): ?int
    {
        if ($cell === null || $cell === '') {
            return null;
        }

        if (is_numeric($cell)) {
            return (int) round(((float) $cell) * 100);
        }

        $s = preg_replace('/[^\d,\.\-]/', '', (string) $cell) ?? '';
        $s = str_replace(',', '', $s);
        if ($s === '' || ! is_numeric($s)) {
            return null;
        }

        return (int) round(((float) $s) * 100);
    }

    private function stringCell(mixed $cell): string
    {
        return trim((string) ($cell ?? ''));
    }

    private function normLabel(string $value): string
    {
        $s = strtolower(trim($value));

        return preg_replace('/\s+/', ' ', $s) ?? '';
    }
}
