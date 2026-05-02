<?php

namespace App\Actions\DamageReports;

use App\Enums\DamageReportStatus;
use App\Models\DamageReport;
use App\Models\Knife;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Services\Notifications\OrderEmailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class CreateDamageReportAction
{
    public function __construct(
        private readonly OrderEmailService $orderEmails,
    ) {}

    /**
     * @param  array{
     *   order_id: string,
     *   description: string,
     *   severity: string,
     *   internal_notes?: string|null,
     *   customer_visible?: bool,
     *   customer_description?: string|null,
     * }  $validated
     */
    public function execute(Knife $knife, array $validated, User $actor, Request $request): DamageReport
    {
        $report = DB::transaction(function () use ($knife, $validated, $actor, $request): DamageReport {
            $knife->refresh();

            /** @var DamageReport $report */
            $report = DamageReport::query()->create([
                'knife_id' => $knife->id,
                'company_id' => $knife->company_id,
                'order_id' => $validated['order_id'],
                'details' => $validated['description'],
                'internal_notes' => $validated['internal_notes'] ?? null,
                'customer_visible' => (bool) ($validated['customer_visible'] ?? false),
                'customer_description' => $validated['customer_description'] ?? null,
                'severity' => $validated['severity'],
                'status' => DamageReportStatus::Open,
                'reported_by_id' => $actor->getKey(),
            ]);

            $report->load(['knife:id,company_id,order_id', 'reportedBy:id,name']);

            AuditRecorder::record($actor, $report, 'damage_report.created', [
                'knife_id' => (string) $knife->id,
                'order_id' => (string) $validated['order_id'],
                'severity' => $validated['severity'],
                'customer_visible' => (bool) ($validated['customer_visible'] ?? false),
            ], $request);

            return $report;
        });

        $this->orderEmails->sendDamageReportCustomerVisible($report);

        return $report;
    }
}
