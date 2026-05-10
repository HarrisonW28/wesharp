<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CashPositionReportRequest;
use App\Http\Requests\Admin\UpdateFinanceCashPositionAssumptionsRequest;
use App\Models\FinanceCashPositionSetting;
use App\Services\Finance\CashPositionReportService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class CashPositionReportController extends Controller
{
    private const ASSUMPTION_FIELDS = [
        'starting_capital_pence',
        'regular_route_price_per_knife_pence',
        'trial_price_per_knife_pence',
        'route_days_per_week',
        'buffer_warning_threshold_pence',
        'conversion_target_price_pence',
        'second_machine_trigger_pence',
        'van_assessment_trigger_pence',
    ];

    public function show(CashPositionReportRequest $request, CashPositionReportService $service): JsonResponse
    {
        return ApiResponses::success($service->build($request));
    }

    public function updateAssumptions(
        UpdateFinanceCashPositionAssumptionsRequest $request,
        CashPositionReportService $service,
    ): JsonResponse {
        $settings = FinanceCashPositionSetting::query()->firstOrCreate(['id' => 1]);

        $data = $request->validated();

        foreach (self::ASSUMPTION_FIELDS as $field) {
            if (array_key_exists($field, $data)) {
                $settings->{$field} = $data[$field];
            }
        }

        $user = $request->user();
        $settings->updated_by_user_id = $user !== null ? $user->id : null;
        $settings->save();

        return ApiResponses::success([
            'assumptions' => $service->assumptionsResponse($settings->fresh()),
        ]);
    }
}
