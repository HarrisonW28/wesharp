<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreServiceAreaRequest;
use App\Http\Requests\Admin\UpdateServiceAreaRequest;
use App\Http\Resources\ServiceAreaResource;
use App\Models\ServiceArea;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

final class ServiceAreaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ServiceArea::class);

        $items = ServiceArea::query()
            ->orderBy('name')
            ->limit(500)
            ->get();

        return ApiResponses::success([
            'items' => ServiceAreaResource::collection($items),
        ]);
    }

    public function store(StoreServiceAreaRequest $request): JsonResponse
    {
        $this->authorize('create', ServiceArea::class);

        $v = $request->validated();
        self::assertCentreRadiusConsistent(
            isset($v['centre_latitude']) ? (float) $v['centre_latitude'] : null,
            isset($v['centre_longitude']) ? (float) $v['centre_longitude'] : null,
            isset($v['radius_metres']) ? (int) $v['radius_metres'] : null
        );

        $country = isset($v['country']) && is_string($v['country']) && $v['country'] !== ''
            ? $v['country']
            : 'GB';

        $area = ServiceArea::query()->create([
            'name' => (string) $v['name'],
            'city' => (string) $v['city'],
            'region' => isset($v['region']) ? (string) $v['region'] : null,
            'country' => (string) $country,
            'postcode_prefix' => isset($v['postcode_prefix']) && is_string($v['postcode_prefix']) && $v['postcode_prefix'] !== ''
                ? strtoupper(trim($v['postcode_prefix']))
                : null,
            'centre_latitude' => isset($v['centre_latitude']) ? (float) $v['centre_latitude'] : null,
            'centre_longitude' => isset($v['centre_longitude']) ? (float) $v['centre_longitude'] : null,
            'radius_metres' => isset($v['radius_metres']) ? (int) $v['radius_metres'] : null,
            'active' => (bool) ($v['active'] ?? true),
        ]);

        AuditRecorder::record($request->user(), $area, 'service_area.created', [
            'name' => $area->name,
            'city' => $area->city,
        ], $request);

        return ApiResponses::success(['area' => ServiceAreaResource::make($area)], 201);
    }

    public function update(UpdateServiceAreaRequest $request, ServiceArea $serviceArea): JsonResponse
    {
        $this->authorize('update', $serviceArea);

        $v = $request->validated();
        if ($v === []) {
            return ApiResponses::success(['area' => ServiceAreaResource::make($serviceArea)]);
        }

        $before = $serviceArea->only(array_keys($v));

        $nextLat = array_key_exists('centre_latitude', $v)
            ? ($v['centre_latitude'] !== null ? (float) $v['centre_latitude'] : null)
            : $serviceArea->centre_latitude;
        $nextLng = array_key_exists('centre_longitude', $v)
            ? ($v['centre_longitude'] !== null ? (float) $v['centre_longitude'] : null)
            : $serviceArea->centre_longitude;
        $nextRadius = array_key_exists('radius_metres', $v)
            ? ($v['radius_metres'] !== null ? (int) $v['radius_metres'] : null)
            : $serviceArea->radius_metres;

        self::assertCentreRadiusConsistent($nextLat, $nextLng, $nextRadius);

        if (isset($v['postcode_prefix'])) {
            $v['postcode_prefix'] = is_string($v['postcode_prefix']) && $v['postcode_prefix'] !== ''
                ? strtoupper(trim($v['postcode_prefix']))
                : null;
        }

        $serviceArea->fill($v);
        $serviceArea->save();

        AuditRecorder::record($request->user(), $serviceArea, 'service_area.updated', [
            'before' => $before,
            'after' => $serviceArea->only(array_keys($v)),
        ], $request);

        return ApiResponses::success(['area' => ServiceAreaResource::make($serviceArea->fresh())]);
    }

    public function destroy(Request $request, ServiceArea $serviceArea): Response
    {
        $this->authorize('delete', $serviceArea);

        AuditRecorder::record($request->user(), $serviceArea, 'service_area.deleted', [
            'name' => $serviceArea->name,
        ], $request);

        $serviceArea->delete();

        return response()->noContent();
    }

    private static function assertCentreRadiusConsistent(?float $lat, ?float $lng, ?int $radiusMetres): void
    {
        $hasLat = $lat !== null;
        $hasLng = $lng !== null;
        if ($hasLat !== $hasLng) {
            throw ValidationException::withMessages([
                'centre_latitude' => ['Set both latitude and longitude for the centre point, or clear both.'],
            ]);
        }
        if ($radiusMetres !== null && ! ($hasLat && $hasLng)) {
            throw ValidationException::withMessages([
                'radius_metres' => ['Choose a centre on the map before setting a coverage radius.'],
            ]);
        }
    }
}
