<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ServiceAreaWaitlistSignup;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ServiceAreaWaitlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(50, max(1, (int) $request->query('per_page', 25)));

        $paginator = ServiceAreaWaitlistSignup::query()
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        $items = $paginator->getCollection()->map(static fn (ServiceAreaWaitlistSignup $row): array => [
            'id' => (string) $row->id,
            'name' => $row->name,
            'email' => $row->email,
            'postcode' => $row->postcode,
            'customer_type' => $row->customer_type,
            'estimated_knife_count' => $row->estimated_knife_count,
            'notes' => $row->notes,
            'created_at' => $row->created_at?->toIso8601String(),
        ]);

        $paginator->setCollection($items);

        return ApiResponses::paginated($paginator, 'items');
    }
}
