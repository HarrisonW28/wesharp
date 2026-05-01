<?php

namespace App\Actions\DamageReports;

use App\Enums\DamageReportStatus;
use App\Models\DamageReport;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ArchiveDamageReportAction
{
    public function execute(DamageReport $report, User $actor, Request $request): DamageReport
    {
        return DB::transaction(function () use ($report, $actor, $request): DamageReport {
            $report->refresh();

            if ($report->archived_at !== null) {
                return $report;
            }

            $report->archived_at = now();
            $report->status = DamageReportStatus::Archived;
            $report->save();

            AuditRecorder::record($actor, $report, 'damage_report.archived', [
                'archived_at' => $report->archived_at?->toIso8601String(),
            ], $request);

            return $report->fresh();
        });
    }
}
