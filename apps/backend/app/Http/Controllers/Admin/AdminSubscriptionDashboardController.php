<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\CompanySubscription;
use App\Models\User;
use App\Support\ApiResponses;
use App\Support\Money\MoneyFormatting;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class AdminSubscriptionDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        \assert($user instanceof User);
        if (! Permissions::userMay($user, Permissions::SUBSCRIPTIONS_VIEW)) {
            abort(403);
        }

        $base = CompanySubscription::query()
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value]);

        $active = (int) (clone $base)->where('status', SubscriptionStatus::Active->value)->count();
        $pastDue = (int) (clone $base)->where('status', SubscriptionStatus::PastDue->value)->count();

        $items = (clone $base)
            ->with(['company:id,name', 'plan:id,name'])
            ->orderByRaw('CASE WHEN renews_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('renews_at')
            ->limit(250)
            ->get()
            ->map(static function (CompanySubscription $s): array {
                $minor = (int) $s->price_amount_minor_snapshot;
                $st = $s->status?->value ?? '';

                return [
                    'subscription_id' => (string) $s->id,
                    'company_id' => (string) $s->company_id,
                    'company_name' => $s->company?->name,
                    'plan_name' => $s->plan?->name ?? 'Plan',
                    'status' => $st,
                    'status_label' => Str::headline(str_replace('_', ' ', $st)),
                    'starts_at' => $s->starts_at?->format('Y-m-d'),
                    'renews_at' => $s->renews_at?->format('Y-m-d'),
                    'price_amount_minor_snapshot' => $minor,
                    'formatted_price_snapshot_gbp' => strtoupper((string) $s->currency) === 'GBP'
                        ? MoneyFormatting::formatGbpFromPence($minor)
                        : null,
                    'crm_path_hint' => '/admin/crm/'.$s->company_id.'?tab=subscription',
                ];
            })
            ->values()
            ->all();

        return ApiResponses::success([
            'kpis' => [
                'active_subscriptions' => $active,
                'past_due_subscriptions' => $pastDue,
                'operational_subscriptions' => $active + $pastDue,
            ],
            'items' => $items,
        ]);
    }
}
