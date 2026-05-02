<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSiteContentRequest;
use App\Services\SiteContent\SiteContentService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class SiteContentController extends Controller
{
    public function show(SiteContentService $content): JsonResponse
    {
        return ApiResponses::success([
            'content' => $content->resolved(),
        ]);
    }

    public function update(UpdateSiteContentRequest $request, SiteContentService $content): JsonResponse
    {
        /** @var array<string, mixed> $tree */
        $tree = $request->validated('content');
        $full = $content->normalizeSubmitted($tree);
        $content->saveFullContentTree($full, $request->user(), $request);

        return ApiResponses::success([
            'content' => $content->resolved(),
        ]);
    }
}
