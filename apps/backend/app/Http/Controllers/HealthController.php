<?php

namespace App\Http\Controllers;

use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return ApiResponses::success([
            'status' => 'ok',
            'schema' => 1,
        ]);
    }
}
