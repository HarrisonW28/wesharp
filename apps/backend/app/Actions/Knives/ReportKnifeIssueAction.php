<?php

namespace App\Actions\Knives;

use App\Enums\KnifeStatus;
use App\Models\Knife;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class ReportKnifeIssueAction
{
    use MarkKnifeTrait;

    public function execute(
        Knife $knife,
        ?string $damageNotes,
        ?Authenticatable $actor,
        ?Request $request,
    ): Knife {
        $patches = [];
        if ($damageNotes !== null && trim($damageNotes) !== '') {
            $patches['damage_notes'] = $damageNotes;
        }

        return $this->transitionKnife(
            $knife,
            KnifeStatus::IssueReported,
            'knife.report_issue',
            $actor,
            $request,
            $patches,
        );
    }
}
