<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponses;

final class TenantSmokeController extends Controller
{
    public function __invoke(): mixed
    {
        return ApiResponses::success([
            'message' => 'tenant',
        ]);
    }
}
