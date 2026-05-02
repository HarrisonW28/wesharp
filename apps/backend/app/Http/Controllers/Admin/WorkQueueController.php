<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Admin\WorkQueueService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class WorkQueueController extends Controller
{
    public function index(Request $request, WorkQueueService $workQueueService): JsonResponse
    {
        $user = $request->user();
        \assert($user instanceof User);

        return ApiResponses::success($workQueueService->build($user));
    }
}
