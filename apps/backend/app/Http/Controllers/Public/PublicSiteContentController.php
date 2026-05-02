<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\SiteContent\SiteContentService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class PublicSiteContentController extends Controller
{
    public function show(SiteContentService $content): JsonResponse
    {
        return ApiResponses::success([
            'content' => $content->resolved(),
        ]);
    }
}
