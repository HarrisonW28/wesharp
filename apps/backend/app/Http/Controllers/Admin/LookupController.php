<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Contact;
use App\Models\Knife;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\User;
use App\Support\ApiResponses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class LookupController extends Controller
{
    private const LIMIT = 25;

    /** @param  Builder<OperationalRoute>  $query */
    private function restrictOperationalRoutesLookupForViewer(Builder $query, User $viewer): void
    {
        $role = $viewer->resolvedRole();

        if ($role === UserRole::SuperAdmin || $role === UserRole::Admin) {
            return;
        }

        if ($role === UserRole::Driver) {
            $query->where('driver_user_id', (int) $viewer->getKey());

            return;
        }

        if ($role === UserRole::RouteManager) {
            $query->where(function (Builder $q) use ($viewer): void {
                $q->whereNull('driver_user_id')
                    ->orWhere('driver_user_id', (int) $viewer->getKey());
            });
        }
    }

    public function companies(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Company::class);

        $items = [];
        $exclude = [];

        $id = trim((string) $request->query('id', ''));
        if ($id !== '' && Str::isUuid($id)) {
            $one = Company::query()->find($id);
            if ($one !== null) {
                $this->authorize('view', $one);
                $items[] = $this->formatCompany($one);
                $exclude[] = $one->id;
            }
        }

        $q = trim((string) $request->query('q', ''));
        $query = Company::query()->select(['id', 'name', 'slug', 'city', 'company_status']);

        if ($exclude !== []) {
            $query->whereNotIn('id', $exclude);
        }

        if ($q !== '') {
            $needle = '%'.$this->escapeLike($q).'%';
            $query->where(function ($sub) use ($q, $needle): void {
                $sub->where('name', 'like', $needle)
                    ->orWhere('slug', 'like', $needle)
                    ->orWhere('city', 'like', $needle);
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            });
        }

        foreach ($query->orderBy('name')->limit(self::LIMIT)->get() as $row) {
            $items[] = $this->formatCompany($row);
        }

        return ApiResponses::success(['items' => $items]);
    }

    public function users(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $items = [];
        $exclude = [];

        $id = trim((string) $request->query('id', ''));
        if ($id !== '' && ctype_digit($id)) {
            $one = User::query()->with('company:id,name')->find((int) $id);
            if ($one !== null) {
                $this->authorize('view', $one);
                $items[] = $this->formatUser($one);
                $exclude[] = $one->id;
            }
        }

        $q = trim((string) $request->query('q', ''));
        $query = User::query()->with('company:id,name')->orderByDesc('updated_at');

        if ($exclude !== []) {
            $query->whereNotIn('id', $exclude);
        }

        if ($q !== '') {
            $needle = '%'.$this->escapeLike($q).'%';
            $query->where(function ($sub) use ($q, $needle): void {
                $sub->where('name', 'like', $needle)
                    ->orWhere('email', 'like', $needle)
                    ->orWhere('clerk_user_id', 'like', $needle);
                if (ctype_digit($q)) {
                    $sub->orWhere('id', (int) $q);
                }
            });
        }

        foreach ($query->limit(self::LIMIT)->get() as $row) {
            $items[] = $this->formatUser($row);
        }

        return ApiResponses::success(['items' => $items]);
    }

    public function bookings(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Booking::class);

        $items = [];
        $exclude = [];

        $id = trim((string) $request->query('id', ''));
        if ($id !== '' && Str::isUuid($id)) {
            $one = Booking::query()->with(['company:id,name', 'location:id,label,city'])->find($id);
            if ($one !== null) {
                $this->authorize('view', $one);
                $items[] = $this->formatBooking($one);
                $exclude[] = $one->id;
            }
        }

        $companyId = trim((string) $request->query('company_id', ''));
        $q = trim((string) $request->query('q', ''));

        $query = Booking::query()->with(['company:id,name', 'location:id,label,city']);

        if ($exclude !== []) {
            $query->whereNotIn('id', $exclude);
        }

        if ($companyId !== '' && Str::isUuid($companyId)) {
            $query->where('company_id', $companyId);
        }

        if ($q !== '') {
            $needle = '%'.$this->escapeLike($q).'%';
            $query->where(function ($sub) use ($q, $needle): void {
                $sub->whereHas('company', fn ($c) => $c->where('name', 'like', $needle));
                $sub->orWhere('booking_status', 'like', $needle);
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            });
        }

        foreach ($query->orderByDesc('scheduled_date')->limit(self::LIMIT)->get() as $row) {
            $this->authorize('view', $row);
            $items[] = $this->formatBooking($row);
        }

        return ApiResponses::success(['items' => $items]);
    }

    public function routes(Request $request): JsonResponse
    {
        $this->authorize('viewAny', OperationalRoute::class);

        $items = [];
        $exclude = [];

        $id = trim((string) $request->query('id', ''));
        if ($id !== '' && Str::isUuid($id)) {
            $one = OperationalRoute::query()->with('driver:id,name')->find($id);
            if ($one !== null) {
                $this->authorize('view', $one);
                $items[] = $this->formatRoute($one);
                $exclude[] = $one->id;
            }
        }

        $q = trim((string) $request->query('q', ''));
        $date = trim((string) $request->query('date', ''));

        $query = OperationalRoute::query()->with('driver:id,name');

        if ($exclude !== []) {
            $query->whereNotIn('id', $exclude);
        }

        if ($date !== '') {
            $ts = strtotime($date);
            if ($ts !== false) {
                $query->whereDate('scheduled_date', date('Y-m-d', $ts));
            }
        }

        if ($q !== '') {
            $needle = '%'.$this->escapeLike($q).'%';
            $query->where(function ($sub) use ($q, $needle): void {
                $sub->where('name', 'like', $needle)
                    ->orWhere('coverage_city', 'like', $needle)
                    ->orWhereHas('driver', fn ($d) => $d->where('name', 'like', $needle));
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            });
        }

        $user = $request->user();
        if ($user instanceof User) {
            $this->restrictOperationalRoutesLookupForViewer($query, $user);
        }

        foreach ($query->orderBy('name')->limit(self::LIMIT)->get() as $row) {
            $items[] = $this->formatRoute($row);
        }

        return ApiResponses::success(['items' => $items]);
    }

    public function orders(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $items = [];
        $exclude = [];

        $id = trim((string) $request->query('id', ''));
        if ($id !== '' && Str::isUuid($id)) {
            $one = Order::query()
                ->with(['company:id,name', 'booking:id,scheduled_date', 'operationalRoute:id,name'])
                ->find($id);
            if ($one !== null) {
                $this->authorize('view', $one);
                $items[] = $this->formatOrder($one);
                $exclude[] = $one->id;
            }
        }

        $companyId = trim((string) $request->query('company_id', ''));
        $q = trim((string) $request->query('q', ''));

        $query = Order::query()->with(['company:id,name', 'booking:id,scheduled_date', 'operationalRoute:id,name']);

        if ($exclude !== []) {
            $query->whereNotIn('id', $exclude);
        }

        if ($companyId !== '' && Str::isUuid($companyId)) {
            $query->where('company_id', $companyId);
        }

        if ($q !== '') {
            $needle = '%'.$this->escapeLike($q).'%';
            $query->where(function ($sub) use ($q, $needle): void {
                $sub->whereHas('company', fn ($c) => $c->where('name', 'like', $needle));
                $sub->orWhere('order_status', 'like', $needle);
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            });
        }

        foreach ($query->orderByDesc('updated_at')->limit(self::LIMIT)->get() as $row) {
            $this->authorize('view', $row);
            $items[] = $this->formatOrder($row);
        }

        return ApiResponses::success(['items' => $items]);
    }

    public function knives(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Knife::class);

        $items = [];
        $exclude = [];

        $id = trim((string) $request->query('id', ''));
        if ($id !== '' && Str::isUuid($id)) {
            $one = Knife::query()->with('company:id,name', 'order:id,order_status')->find($id);
            if ($one !== null) {
                $this->authorize('view', $one);
                $items[] = $this->formatKnife($one);
                $exclude[] = $one->id;
            }
        }

        $companyId = trim((string) $request->query('company_id', ''));
        $q = trim((string) $request->query('q', ''));

        $query = Knife::query()->with('company:id,name', 'order:id,order_status');

        if ($exclude !== []) {
            $query->whereNotIn('id', $exclude);
        }

        if ($companyId !== '' && Str::isUuid($companyId)) {
            $query->where('company_id', $companyId);
        }

        if ($request->boolean('resharpen_eligible_only')) {
            $terminal = [
                OrderStatus::Completed->value,
                OrderStatus::Invoiced->value,
                OrderStatus::Returned->value,
                OrderStatus::Cancelled->value,
            ];
            $query->where(function ($sub) use ($terminal): void {
                $sub->whereNull('order_id')
                    ->orWhereHas('order', fn ($oq) => $oq->whereIn('order_status', $terminal));
            });
        } elseif ($request->boolean('unassigned_only')) {
            $query->whereNull('order_id');
        }

        if ($q !== '') {
            $needle = '%'.$this->escapeLike($q).'%';
            $query->where(function ($sub) use ($q, $needle): void {
                $sub->where('tag_id', 'like', $needle)
                    ->orWhere('label', 'like', $needle)
                    ->orWhere('description', 'like', $needle)
                    ->orWhere('knife_type', 'like', $needle);
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            });
        }

        foreach ($query->orderByDesc('updated_at')->limit(self::LIMIT)->get() as $row) {
            $this->authorize('view', $row);
            $items[] = $this->formatKnife($row);
        }

        return ApiResponses::success(['items' => $items]);
    }

    public function locations(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Company::class);

        $items = [];
        $exclude = [];

        $id = trim((string) $request->query('id', ''));
        if ($id !== '' && Str::isUuid($id)) {
            $one = CompanyLocation::query()->with('company:id,name')->find($id);
            if ($one !== null && $one->company !== null) {
                $this->authorize('view', $one->company);
                $items[] = $this->formatLocation($one);
                $exclude[] = $one->id;
            }
        }

        $companyId = trim((string) $request->query('company_id', ''));
        $q = trim((string) $request->query('q', ''));

        $query = CompanyLocation::query()->with('company:id,name');

        if ($exclude !== []) {
            $query->whereNotIn('id', $exclude);
        }

        if ($companyId !== '' && Str::isUuid($companyId)) {
            $query->where('company_id', $companyId);
        }

        $query->whereNull('archived_at');

        if ($q !== '') {
            $needle = '%'.$this->escapeLike($q).'%';
            $query->where(function ($sub) use ($q, $needle): void {
                $sub->where('label', 'like', $needle)
                    ->orWhere('city', 'like', $needle)
                    ->orWhere('line_one', 'like', $needle)
                    ->orWhere('postcode', 'like', $needle)
                    ->orWhereHas('company', fn ($c) => $c->where('name', 'like', $needle));
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            });
        }

        foreach ($query->orderBy('label')->limit(self::LIMIT)->get() as $row) {
            if ($row->company === null) {
                continue;
            }
            $this->authorize('view', $row->company);
            $items[] = $this->formatLocation($row);
        }

        return ApiResponses::success(['items' => $items]);
    }

    public function contacts(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Company::class);

        $items = [];
        $exclude = [];

        $id = trim((string) $request->query('id', ''));
        if ($id !== '' && Str::isUuid($id)) {
            $one = Contact::query()->with('company:id,name')->find($id);
            if ($one !== null && $one->company !== null) {
                $this->authorize('view', $one->company);
                $items[] = $this->formatContact($one);
                $exclude[] = $one->id;
            }
        }

        $companyId = trim((string) $request->query('company_id', ''));
        $q = trim((string) $request->query('q', ''));

        $query = Contact::query()->with('company:id,name');

        if ($exclude !== []) {
            $query->whereNotIn('id', $exclude);
        }

        if ($companyId !== '' && Str::isUuid($companyId)) {
            $query->where('company_id', $companyId);
        }

        $query->whereNull('archived_at');

        if ($q !== '') {
            $needle = '%'.$this->escapeLike($q).'%';
            $query->where(function ($sub) use ($q, $needle): void {
                $sub->where('first_name', 'like', $needle)
                    ->orWhere('last_name', 'like', $needle)
                    ->orWhere('email', 'like', $needle)
                    ->orWhere('phone', 'like', $needle)
                    ->orWhereHas('company', fn ($c) => $c->where('name', 'like', $needle));
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            });
        }

        foreach ($query->orderBy('last_name')->limit(self::LIMIT)->get() as $row) {
            if ($row->company === null) {
                continue;
            }
            $this->authorize('view', $row->company);
            $items[] = $this->formatContact($row);
        }

        return ApiResponses::success(['items' => $items]);
    }

    /** @return array{id: string, label: string, description: ?string, meta: array<string, mixed>} */
    private function formatCompany(Company $c): array
    {
        $status = $c->company_status?->value;
        $desc = trim(implode(' · ', array_filter([$c->city, $status])));

        return [
            'id' => (string) $c->id,
            'label' => $c->name,
            'description' => $desc !== '' ? $desc : null,
            'meta' => ['slug' => $c->slug, 'city' => $c->city],
        ];
    }

    /** @return array{id: string, label: string, description: ?string, meta: array<string, mixed>} */
    private function formatUser(User $u): array
    {
        $role = $u->resolvedRole()->value;
        $companyName = $u->company?->name;
        $desc = trim(implode(' · ', array_filter([$u->email, $role, $companyName])));

        return [
            'id' => (string) $u->id,
            'label' => $u->name ?? $u->email ?? 'User #'.$u->id,
            'description' => $desc !== '' ? $desc : null,
            'meta' => ['email' => $u->email, 'role' => $role],
        ];
    }

    /** @return array{id: string, label: string, description: ?string, meta: array<string, mixed>} */
    private function formatBooking(Booking $b): array
    {
        $account = $b->company?->name ?? 'Booking';
        $date = $b->scheduled_date?->format('Y-m-d') ?? '—';
        $status = $b->booking_status?->value ?? '';
        $site = $b->location?->label;

        return [
            'id' => (string) $b->id,
            'label' => $account.' · '.$date,
            'description' => trim($status.($site ? ' · '.$site : '')),
            'meta' => ['status' => $status, 'scheduled_date' => $date],
        ];
    }

    /** @return array{id: string, label: string, description: ?string, meta: array<string, mixed>} */
    private function formatRoute(OperationalRoute $r): array
    {
        $date = $r->scheduled_date?->format('Y-m-d') ?? '—';
        $driver = $r->driver?->name;
        $name = $r->name ?? 'Route';

        return [
            'id' => (string) $r->id,
            'label' => $name.' · '.$date,
            'description' => trim(implode(' · ', array_filter([$r->route_status?->value, $driver, $r->coverage_city]))),
            'meta' => ['scheduled_date' => $date, 'driver_name' => $driver],
        ];
    }

    /** @return array{id: string, label: string, description: ?string, meta: array<string, mixed>} */
    private function formatOrder(Order $o): array
    {
        $account = $o->company?->name ?? 'Order';
        $total = number_format(($o->total_pence ?? 0) / 100, 2);
        $currency = $o->currency ?? 'GBP';
        $status = $o->order_status?->value ?? '';

        return [
            'id' => (string) $o->id,
            'label' => $account.' · '.$status,
            'description' => $currency.' '.$total.' · '.($o->booking?->scheduled_date?->format('Y-m-d') ?? '—'),
            'meta' => ['payment_status' => $o->payment_status?->value],
        ];
    }

    /** @return array{id: string, label: string, description: ?string, meta: array<string, mixed>} */
    private function formatKnife(Knife $k): array
    {
        $tag = ($k->tag_id ?? '') !== '' ? $k->tag_id : 'Blade '.substr((string) $k->id, 0, 8);
        $account = $k->company?->name;
        $readable = trim((string) ($k->label ?? ''));
        $primaryLabel = $readable !== '' ? $readable : $tag;

        return [
            'id' => (string) $k->id,
            'label' => $primaryLabel,
            'description' => trim(implode(' · ', array_filter([$tag, $k->knife_type, $account]))),
            'meta' => [
                'knife_status' => $k->knife_status?->value,
                'company_id' => (string) $k->company_id,
                'company_name' => $k->company?->name,
                'order_id' => $k->order_id !== null ? (string) $k->order_id : null,
                'order_status' => $k->order?->order_status?->value,
            ],
        ];
    }

    /** @return array{id: string, label: string, description: ?string, meta: array<string, mixed>} */
    private function formatLocation(CompanyLocation $loc): array
    {
        $account = $loc->company?->name;
        $city = $loc->city;

        return [
            'id' => (string) $loc->id,
            'label' => $loc->label,
            'description' => trim(implode(' · ', array_filter([$city, $account]))),
            'meta' => ['postcode' => $loc->postcode],
        ];
    }

    /** @return array{id: string, label: string, description: ?string, meta: array<string, mixed>} */
    private function formatContact(Contact $c): array
    {
        $name = trim($c->first_name.' '.$c->last_name);
        $account = $c->company?->name;

        return [
            'id' => (string) $c->id,
            'label' => $name !== '' ? $name : ($c->email ?? 'Contact'),
            'description' => trim(implode(' · ', array_filter([$c->email, $c->phone, $account]))),
            'meta' => [],
        ];
    }

    /**
     * Drivers / run leads for route assignment — internal ops roles only (no tenant users).
     */
    public function routeDrivers(Request $request): JsonResponse
    {
        $this->authorize('create', OperationalRoute::class);

        $q = trim((string) $request->query('q', ''));

        $roles = [
            UserRole::SuperAdmin->value,
            UserRole::Admin->value,
            UserRole::RouteManager->value,
            UserRole::Driver->value,
        ];

        $query = User::query()
            ->where('status', UserStatus::Active)
            ->whereIn('role', $roles)
            ->orderBy('name');

        if ($q !== '') {
            $needle = '%'.$this->escapeLike($q).'%';
            $query->where(function ($sub) use ($needle, $q): void {
                $sub->where('name', 'like', $needle)
                    ->orWhere('email', 'like', $needle);
                if (ctype_digit($q)) {
                    $sub->orWhere('id', (int) $q);
                }
            });
        }

        $items = $query->limit(40)->get()->map(static fn (User $user): array => [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->resolvedRole()->value,
        ])->values()->all();

        return ApiResponses::success(['items' => $items]);
    }

    /** Sales-role staff for Sales/POS performance report filters (no users.view lookup gate). */
    public function salesStaffForReporting(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        $query = User::query()
            ->where('status', UserStatus::Active)
            ->where('role', UserRole::Sales)
            ->orderBy('name');

        if ($q !== '') {
            $needle = '%'.$this->escapeLike($q).'%';
            $query->where(function ($sub) use ($needle, $q): void {
                $sub->where('name', 'like', $needle)
                    ->orWhere('email', 'like', $needle);
                if (ctype_digit($q)) {
                    $sub->orWhere('id', (int) $q);
                }
            });
        }

        $items = $query->limit(60)->get()->map(static fn (User $user): array => [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ])->values()->all();

        return ApiResponses::success(['items' => $items]);
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
