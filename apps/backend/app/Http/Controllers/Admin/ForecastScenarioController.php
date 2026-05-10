<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreForecastScenarioRequest;
use App\Http\Requests\Admin\UpdateForecastScenarioRequest;
use App\Models\FinanceForecastScenario;
use App\Services\Finance\ForecastScenarioReportService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

final class ForecastScenarioController extends Controller
{
    public function __construct(
        private readonly ForecastScenarioReportService $reports,
    ) {}

    public function index(): JsonResponse
    {
        $rows = FinanceForecastScenario::query()
            ->orderByRaw('preset_key is null')
            ->orderBy('preset_key')
            ->orderBy('name')
            ->get();

        return ApiResponses::success([
            'scenarios' => $rows->map(fn (FinanceForecastScenario $s) => $this->reports->scenarioRow($s))->values()->all(),
        ]);
    }

    public function show(FinanceForecastScenario $scenario): JsonResponse
    {
        return ApiResponses::success($this->reports->fullPayload($scenario));
    }

    public function store(StoreForecastScenarioRequest $request): JsonResponse
    {
        $merged = $this->reports->mergedInputs($request->input('inputs', []));

        $scenario = FinanceForecastScenario::query()->create([
            'name' => $request->validated('name'),
            'scenario_type' => $request->validated('scenario_type'),
            'inputs' => $merged,
            'created_by_user_id' => $request->user()?->id,
        ]);

        return ApiResponses::success($this->reports->fullPayload($scenario->fresh()), SymfonyResponse::HTTP_CREATED);
    }

    public function update(UpdateForecastScenarioRequest $request, FinanceForecastScenario $scenario): JsonResponse
    {
        if ($scenario->preset_key !== null && $request->has('scenario_type')) {
            return ApiResponses::error('Preset scenario types are locked.', 'preset_locked', SymfonyResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $data = $request->validated();

        if (isset($data['name'])) {
            $scenario->name = $data['name'];
        }

        if (isset($data['scenario_type']) && $scenario->preset_key === null) {
            $scenario->scenario_type = $data['scenario_type'];
        }

        if ($request->has('inputs')) {
            $combined = array_merge($scenario->inputs ?? [], $request->input('inputs', []));
            $scenario->inputs = $this->reports->mergedInputs($combined);
        }

        $scenario->save();

        return ApiResponses::success($this->reports->fullPayload($scenario->fresh()));
    }

    public function destroy(FinanceForecastScenario $scenario): JsonResponse
    {
        if ($scenario->preset_key !== null) {
            return ApiResponses::error('Preset scenarios cannot be deleted.', 'preset_locked', SymfonyResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $scenario->delete();

        return ApiResponses::success(null);
    }
}
