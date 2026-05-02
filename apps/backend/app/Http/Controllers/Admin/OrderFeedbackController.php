<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateAdminOrderFeedbackRequest;
use App\Models\Company;
use App\Models\OrderFeedback;
use App\Support\ApiResponses;
use App\Support\Orders\OrderFeedbackJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OrderFeedbackController extends Controller
{
    public function index(Request $request, Company $company): JsonResponse
    {
        $this->authorize('view', $company);

        $perPage = min(75, max(1, (int) $request->query('per_page', 25)));

        $paginator = OrderFeedback::query()
            ->where('company_id', $company->id)
            ->with([
                'order' => fn ($q) => $q
                    ->select(['id', 'company_id', 'booking_id', 'route_id', 'order_status', 'completed_at', 'created_at'])
                    ->with([
                        'booking:id,contact_id',
                        'booking.contact:id,first_name,last_name,email',
                        'operationalRoute:id,name,scheduled_date',
                    ]),
            ])
            ->orderByDesc('submitted_at')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $items = collect($paginator->items())->map(static fn (OrderFeedback $f): array => OrderFeedbackJson::adminRow($f))->values();
        $paginator->setCollection($items);

        $pagination = [
            'page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'total_pages' => (int) max(1, ceil($paginator->total() / max(1, $paginator->perPage()))),
            'has_more_pages' => $paginator->hasMorePages(),
        ];

        return ApiResponses::successWithMeta(
            ['pagination' => $pagination],
            ['items' => $items],
        );
    }

    public function update(UpdateAdminOrderFeedbackRequest $request, Company $company, OrderFeedback $feedback): JsonResponse
    {
        if ((string) $feedback->company_id !== (string) $company->id) {
            abort(404);
        }

        $this->authorize('review', $feedback);

        $data = $request->validated();
        $user = $request->user();
        \assert($user !== null);

        if (array_key_exists('staff_reviewed', $data)) {
            if ($data['staff_reviewed']) {
                $feedback->staff_reviewed_at = now();
                $feedback->staff_reviewed_by_user_id = $user->id;
            } else {
                $feedback->staff_reviewed_at = null;
                $feedback->staff_reviewed_by_user_id = null;
            }
        }

        if (array_key_exists('testimonial_marketing_approved', $data) && $data['testimonial_marketing_approved']) {
            $feedback->testimonial_marketing_approved_at = now();
        }

        $feedback->save();

        return ApiResponses::success(OrderFeedbackJson::adminRow($feedback->fresh()));
    }
}
