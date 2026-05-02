<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\ApiResponses;
use App\Support\Notifications\NotificationPreviewFixtures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class NotificationEmailPreviewController extends Controller
{
    public function show(Request $request, NotificationPreviewFixtures $fixtures): JsonResponse
    {
        /** @var array{preset?: string} $validated */
        $validated = $request->validate([
            'preset' => ['sometimes', 'string', Rule::in(['generic', 'booking', 'order', 'invoice', 'subscription'])],
        ]);

        $preset = $validated['preset'] ?? 'generic';
        $rendered = $fixtures->renderHtml($preset);

        return ApiResponses::success($rendered);
    }
}
