<?php

namespace App\Actions\DamageReports;

use App\Enums\DamageReportSeverity;
use App\Enums\DamageReportStatus;
use App\Models\DamageReport;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class UpdateDamageReportAction
{
    /**
     * @param  array<string, mixed>  $validated
     */
    public function execute(DamageReport $report, array $validated, User $actor, Request $request): DamageReport
    {
        return DB::transaction(function () use ($report, $validated, $actor, $request): DamageReport {
            $report->refresh();

            $trackKeys = [
                'details',
                'internal_notes',
                'customer_visible',
                'customer_description',
                'severity',
                'status',
                'resolved_at',
            ];

            $before = $report->only($trackKeys);
            $beforeVisible = (bool) $report->customer_visible;
            $beforeStatus = $report->status;

            if (array_key_exists('description', $validated)) {
                $report->details = $validated['description'];
            }
            if (array_key_exists('internal_notes', $validated)) {
                $report->internal_notes = $validated['internal_notes'];
            }
            if (array_key_exists('customer_visible', $validated)) {
                $report->customer_visible = (bool) $validated['customer_visible'];
            }
            if (array_key_exists('customer_description', $validated)) {
                $report->customer_description = $validated['customer_description'];
            }
            if (array_key_exists('severity', $validated)) {
                $report->severity = DamageReportSeverity::from((string) $validated['severity']);
            }

            if (array_key_exists('status', $validated)) {
                $newStatus = DamageReportStatus::from((string) $validated['status']);
                $report->status = $newStatus;
                if ($newStatus === DamageReportStatus::Resolved && $report->resolved_at === null) {
                    $report->resolved_at = now();
                }
                if ($newStatus === DamageReportStatus::Open) {
                    $report->resolved_at = null;
                }
            }

            $report->save();

            $after = $report->only($trackKeys);

            AuditRecorder::record($actor, $report, 'damage_report.updated', [
                'before' => $before,
                'after' => $after,
            ], $request);

            $afterVisible = (bool) $report->customer_visible;
            if ($beforeVisible !== $afterVisible) {
                AuditRecorder::record($actor, $report, 'damage_report.visibility_changed', [
                    'before' => $beforeVisible,
                    'after' => $afterVisible,
                ], $request);
            }

            if ($beforeStatus !== DamageReportStatus::Resolved && $report->status === DamageReportStatus::Resolved) {
                AuditRecorder::record($actor, $report, 'damage_report.resolved', [
                    'resolved_at' => $report->resolved_at?->toIso8601String(),
                ], $request);
            }

            return $report->fresh();
        });
    }
}
