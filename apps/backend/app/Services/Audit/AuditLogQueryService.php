<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\Payment;
use App\Models\RouteStop;
use App\Models\User;
use App\Support\Audit\AuditLogCompanyResolver;
use App\Support\Audit\AuditLogPresenter;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

final class AuditLogQueryService
{
    private const PER_PAGE_DEFAULT = 25;

    private const PER_PAGE_MAX = 100;

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, AuditLog>
     */
    public function paginateForStaff(User $viewer, array $filters): LengthAwarePaginator
    {
        $query = AuditLog::query()
            ->with(['actor:id,name,email'])
            ->orderByDesc('created_at');

        $this->applyRoleScope($viewer, $query);

        $this->applyFilters($query, $filters);

        $perPage = (int) ($filters['per_page'] ?? self::PER_PAGE_DEFAULT);
        if ($perPage < 1) {
            $perPage = self::PER_PAGE_DEFAULT;
        }
        $perPage = min($perPage, self::PER_PAGE_MAX);

        return $query->paginate($perPage)->withQueryString();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function presentPage(LengthAwarePaginator $page): array
    {
        $rows = collect($page->items());
        $companyMap = AuditLogCompanyResolver::mapForLogs($rows);

        $out = [];
        foreach ($rows as $log) {
            /** @var AuditLog $log */
            $row = AuditLogPresenter::toArray($log, includeIp: true);
            $row['company'] = $companyMap[(string) $log->id] ?? null;
            $out[] = $row;
        }

        return $out;
    }

    private function applyRoleScope(User $viewer, Builder $query): void
    {
        $role = $viewer->resolvedRole();

        if ($role === UserRole::SuperAdmin || $role === UserRole::Developer) {
            return;
        }

        if ($role === UserRole::Finance) {
            $query->where(function (Builder $q): void {
                $q->whereIn('auditable_type', [
                    Invoice::class,
                    Payment::class,
                    Order::class,
                    Company::class,
                ])->orWhere('action', 'like', 'invoice.%')
                    ->orWhere('action', 'like', 'payment.%')
                    ->orWhere('action', 'like', 'company.%');
            });

            return;
        }

        if ($role === UserRole::RouteManager) {
            $query->where(function (Builder $q): void {
                $q->whereIn('auditable_type', [
                    Booking::class,
                    Order::class,
                    Knife::class,
                    OperationalRoute::class,
                    RouteStop::class,
                    Company::class,
                ])->orWhere('action', 'like', 'booking.%')
                    ->orWhere('action', 'like', 'order.%')
                    ->orWhere('action', 'like', 'knife.%')
                    ->orWhere('action', 'like', 'route.%')
                    ->orWhere('action', 'like', 'route_stop.%')
                    ->orWhere('action', 'like', 'public.booking%');
            });
        }
    }

    /**
     * @param  Builder<AuditLog>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        if (($q = $filters['q'] ?? '') !== '' && is_string($q)) {
            $like = '%'.addcslashes($q, '%_\\').'%';
            $query->where(function (Builder $inner) use ($like): void {
                $inner->where('action', 'like', $like)
                    ->orWhere('auditable_id', 'like', $like);
            });
        }

        if (($from = $filters['date_from'] ?? '') !== '' && is_string($from)) {
            $query->whereDate('created_at', '>=', $from);
        }
        if (($to = $filters['date_to'] ?? '') !== '' && is_string($to)) {
            $query->whereDate('created_at', '<=', $to);
        }

        if (($actor = $filters['actor_id'] ?? '') !== '' && is_string($actor)) {
            $query->where('actor_id', $actor);
        }

        if (($action = $filters['action'] ?? '') !== '' && is_string($action)) {
            $query->where('action', $action);
        }

        if (($rid = $filters['request_id'] ?? '') !== '' && is_string($rid)) {
            $query->where('request_id', $rid);
        }

        $subjectType = $filters['subject_type'] ?? '';
        if (is_string($subjectType) && $subjectType !== '') {
            $class = self::subjectClassFromShort($subjectType);
            if ($class !== null) {
                $query->where('auditable_type', $class);
            }
        }

        $companyId = $filters['company_id'] ?? '';
        if (is_string($companyId) && $companyId !== '') {
            $query->where(function (Builder $q) use ($companyId): void {
                $q->where(function (Builder $q2) use ($companyId): void {
                    $q2->where('auditable_type', Company::class)->where('auditable_id', $companyId);
                })->orWhere(function (Builder $q2) use ($companyId): void {
                    $q2->where('auditable_type', Booking::class)
                        ->whereIn('auditable_id', Booking::query()->where('company_id', $companyId)->select('id'));
                })->orWhere(function (Builder $q2) use ($companyId): void {
                    $q2->where('auditable_type', Order::class)
                        ->whereIn('auditable_id', Order::query()->where('company_id', $companyId)->select('id'));
                })->orWhere(function (Builder $q2) use ($companyId): void {
                    $q2->where('auditable_type', Invoice::class)
                        ->whereIn('auditable_id', Invoice::query()->where('company_id', $companyId)->select('id'));
                })->orWhere(function (Builder $q2) use ($companyId): void {
                    $q2->where('auditable_type', Payment::class)
                        ->whereIn('auditable_id', Payment::query()->where('company_id', $companyId)->select('id'));
                })->orWhere(function (Builder $q2) use ($companyId): void {
                    $q2->where('auditable_type', Knife::class)
                        ->whereIn('auditable_id', Knife::query()->where('company_id', $companyId)->select('id'));
                })->orWhere(function (Builder $q2) use ($companyId): void {
                    $q2->where('auditable_type', User::class)
                        ->whereIn('auditable_id', User::query()->where('company_id', $companyId)->select('id'));
                })->orWhere(function (Builder $q2) use ($companyId): void {
                    $q2->where('auditable_type', RouteStop::class)
                        ->whereIn(
                            'auditable_id',
                            RouteStop::query()
                                ->whereIn('booking_id', Booking::query()->where('company_id', $companyId)->select('id'))
                                ->select('id')
                        );
                });
            });
        }
    }

    private static function subjectClassFromShort(string $short): ?string
    {
        $map = [
            'company' => Company::class,
            'booking' => Booking::class,
            'order' => Order::class,
            'invoice' => Invoice::class,
            'payment' => Payment::class,
            'knife' => Knife::class,
            'operational_route' => OperationalRoute::class,
            'route_stop' => RouteStop::class,
            'user' => User::class,
        ];

        return $map[$short] ?? null;
    }
}
