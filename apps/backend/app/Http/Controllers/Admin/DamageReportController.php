<?php

namespace App\Http\Controllers\Admin;

use App\Actions\DamageReports\ArchiveDamageReportAction;
use App\Actions\DamageReports\CreateDamageReportAction;
use App\Actions\DamageReports\UpdateDamageReportAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDamageReportRequest;
use App\Http\Requests\UpdateDamageReportRequest;
use App\Models\DamageReport;
use App\Models\Knife;
use App\Support\ApiResponses;
use App\Support\Knives\KnifeJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DamageReportController extends Controller
{
    public function __construct(
        private readonly CreateDamageReportAction $createDamageReportAction,
        private readonly UpdateDamageReportAction $updateDamageReportAction,
        private readonly ArchiveDamageReportAction $archiveDamageReportAction,
    ) {}

    public function store(StoreDamageReportRequest $request, Knife $knife): JsonResponse
    {
        $this->authorize('update', $knife);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->createDamageReportAction->execute($knife, $request->validated(), $user, $request);

        $knife->refresh();
        $knife->loadMissing(KnifeJson::detailEagerLoadRelations());

        return ApiResponses::success(KnifeJson::detail($knife), 201);
    }

    public function update(UpdateDamageReportRequest $request, DamageReport $damageReport): JsonResponse
    {
        $damageReport->loadMissing('knife');
        $this->authorize('update', $damageReport);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->updateDamageReportAction->execute($damageReport, $request->validated(), $user, $request);

        $knife = $damageReport->knife;
        if ($knife === null) {
            abort(404);
        }

        $knife->refresh();
        $knife->loadMissing(KnifeJson::detailEagerLoadRelations());

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function archive(Request $request, DamageReport $damageReport): JsonResponse
    {
        $damageReport->loadMissing('knife');
        $this->authorize('update', $damageReport);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->archiveDamageReportAction->execute($damageReport, $user, $request);

        $knife = Knife::query()->findOrFail($damageReport->knife_id);
        $knife->loadMissing(KnifeJson::detailEagerLoadRelations());

        return ApiResponses::success(KnifeJson::detail($knife));
    }
}
