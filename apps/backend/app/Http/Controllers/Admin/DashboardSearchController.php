<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Contact;
use App\Models\Knife;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\UploadedFile;
use App\Models\User;
use App\Support\ApiResponses;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Aggregated typeahead for the operations console (fan-in across entities the actor can view).
 */
final class DashboardSearchController extends Controller
{
    private const LIMIT_PER_TYPE = 6;

    public function __invoke(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if ($q === '' || (strlen($q) < 2 && ! Str::isUuid($q) && ! ctype_digit($q))) {
            return ApiResponses::success(['items' => []]);
        }

        $items = [];

        if (Gate::allows('viewAny', Company::class)) {
            $items = array_merge($items, $this->searchCompanies($q));
        }

        if (Gate::allows('viewAny', Booking::class)) {
            $items = array_merge($items, $this->searchBookings($q));
        }

        if (Gate::allows('viewAny', Order::class)) {
            $items = array_merge($items, $this->searchOrders($q));
        }

        if (Gate::allows('viewAny', Knife::class)) {
            $items = array_merge($items, $this->searchKnives($q));
        }

        if (Gate::allows('viewAny', User::class)) {
            $items = array_merge($items, $this->searchUsers($q));
        }

        if (Gate::allows('viewAny', OperationalRoute::class)) {
            $items = array_merge($items, $this->searchRoutes($q));
        }

        if (Gate::allows('viewAny', Company::class)) {
            $items = array_merge($items, $this->searchContacts($q));
            $items = array_merge($items, $this->searchLocations($q));
        }

        return ApiResponses::success(['items' => $items]);
    }

    /** @return list<array{kind: string, id: string, label: string, description: ?string, path: string, image_url: ?string}> */
    private function searchCompanies(string $q): array
    {
        $needle = '%'.$this->escapeLike($q).'%';
        $query = Company::query()
            ->select(['id', 'name', 'slug', 'city', 'company_status'])
            ->with(['uploadedFiles' => static fn ($rel) => $rel
                ->where('mime_type', 'like', 'image/%')
                ->orderBy('created_at')
                ->limit(1),
            ])
            ->where(function ($sub) use ($q, $needle): void {
                $sub->where('name', 'like', $needle)
                    ->orWhere('slug', 'like', $needle)
                    ->orWhere('city', 'like', $needle);
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            })
            ->orderBy('name')
            ->limit(self::LIMIT_PER_TYPE);

        $out = [];
        foreach ($query->get() as $row) {
            if (! Gate::allows('view', $row)) {
                continue;
            }
            $status = $row->company_status?->value;
            $desc = trim(implode(' · ', array_filter([$row->city, $status])));
            $out[] = [
                'kind' => 'company',
                'id' => (string) $row->id,
                'label' => $row->name,
                'description' => $desc !== '' ? $desc : null,
                'path' => '/admin/crm/'.$row->id,
                'image_url' => $this->publicImageUrlFromUploadedFiles($row->uploadedFiles),
            ];
        }

        return $out;
    }

    /** @return list<array{kind: string, id: string, label: string, description: ?string, path: string, image_url: ?string}> */
    private function searchBookings(string $q): array
    {
        $needle = '%'.$this->escapeLike($q).'%';
        $query = Booking::query()
            ->with(['company:id,name', 'location:id,label,city'])
            ->where(function ($sub) use ($q, $needle): void {
                $sub->whereHas('company', fn ($c) => $c->where('name', 'like', $needle));
                $sub->orWhere('booking_status', 'like', $needle);
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            })
            ->orderByDesc('scheduled_date')
            ->limit(self::LIMIT_PER_TYPE);

        $out = [];
        foreach ($query->get() as $row) {
            if (! Gate::allows('view', $row)) {
                continue;
            }
            $account = $row->company?->name ?? 'Booking';
            $date = $row->scheduled_date?->format('Y-m-d') ?? '—';
            $status = $row->booking_status?->value ?? '';
            $site = $row->location?->label;
            $out[] = [
                'kind' => 'booking',
                'id' => (string) $row->id,
                'label' => $account.' · '.$date,
                'description' => trim($status.($site !== null && $site !== '' ? ' · '.$site : '')) ?: null,
                'path' => '/admin/bookings/'.$row->id,
                'image_url' => null,
            ];
        }

        return $out;
    }

    /** @return list<array{kind: string, id: string, label: string, description: ?string, path: string, image_url: ?string}> */
    private function searchOrders(string $q): array
    {
        $needle = '%'.$this->escapeLike($q).'%';
        $query = Order::query()
            ->with(['company:id,name', 'booking:id,scheduled_date'])
            ->where(function ($sub) use ($q, $needle): void {
                $sub->whereHas('company', fn ($c) => $c->where('name', 'like', $needle));
                $sub->orWhere('order_status', 'like', $needle);
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            })
            ->orderByDesc('updated_at')
            ->limit(self::LIMIT_PER_TYPE);

        $out = [];
        foreach ($query->get() as $row) {
            if (! Gate::allows('view', $row)) {
                continue;
            }
            $account = $row->company?->name ?? 'Order';
            $total = number_format(($row->total_pence ?? 0) / 100, 2);
            $currency = $row->currency ?? 'GBP';
            $status = $row->order_status?->value ?? '';
            $out[] = [
                'kind' => 'order',
                'id' => (string) $row->id,
                'label' => $account.' · '.$status,
                'description' => $currency.' '.$total.' · '.($row->booking?->scheduled_date?->format('Y-m-d') ?? '—'),
                'path' => '/admin/orders/'.$row->id,
                'image_url' => null,
            ];
        }

        return $out;
    }

    /** @return list<array{kind: string, id: string, label: string, description: ?string, path: string, image_url: ?string}> */
    private function searchKnives(string $q): array
    {
        $needle = '%'.$this->escapeLike($q).'%';
        $query = Knife::query()
            ->with([
                'company:id,name',
                'order:id,order_status',
                'photos' => static fn ($rel) => $rel->orderBy('sort_order')->orderBy('created_at')->limit(1),
                'photos.uploadedFile',
            ])
            ->where(function ($sub) use ($q, $needle): void {
                $sub->where('tag_id', 'like', $needle)
                    ->orWhere('label', 'like', $needle)
                    ->orWhere('description', 'like', $needle)
                    ->orWhere('knife_type', 'like', $needle)
                    ->orWhereHas('company', fn ($c) => $c->where('name', 'like', $needle));
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            })
            ->orderByDesc('updated_at')
            ->limit(self::LIMIT_PER_TYPE);

        $out = [];
        foreach ($query->get() as $row) {
            if (! Gate::allows('view', $row)) {
                continue;
            }
            $tag = ($row->tag_id ?? '') !== '' ? $row->tag_id : 'Blade '.substr((string) $row->id, 0, 8);
            $account = $row->company?->name;
            $readable = trim((string) ($row->label ?? ''));
            $primaryLabel = $readable !== '' ? $readable : $tag;
            $photo = $row->photos->first();
            $file = $photo?->uploadedFile;
            $imageUrl = $file instanceof UploadedFile ? $this->publicImageUrlFromFile($file) : null;

            $out[] = [
                'kind' => 'knife',
                'id' => (string) $row->id,
                'label' => $primaryLabel,
                'description' => trim(implode(' · ', array_filter([$tag, $row->knife_type, $account]))) ?: null,
                'path' => '/admin/knives/'.$row->id,
                'image_url' => $imageUrl,
            ];
        }

        return $out;
    }

    /** @return list<array{kind: string, id: string, label: string, description: ?string, path: string, image_url: ?string}> */
    private function searchUsers(string $q): array
    {
        $needle = '%'.$this->escapeLike($q).'%';
        $query = User::query()
            ->with('company:id,name')
            ->where(function ($sub) use ($q, $needle): void {
                $sub->where('name', 'like', $needle)
                    ->orWhere('email', 'like', $needle)
                    ->orWhere('clerk_user_id', 'like', $needle);
                if (ctype_digit($q)) {
                    $sub->orWhere('id', (int) $q);
                }
            })
            ->orderByDesc('updated_at')
            ->limit(self::LIMIT_PER_TYPE);

        $out = [];
        foreach ($query->get() as $row) {
            if (! Gate::allows('view', $row)) {
                continue;
            }
            $role = $row->resolvedRole()->value;
            $companyName = $row->company?->name;
            $desc = trim(implode(' · ', array_filter([$row->email, $role, $companyName])));
            $out[] = [
                'kind' => 'user',
                'id' => (string) $row->id,
                'label' => $row->name ?? $row->email ?? 'User #'.$row->id,
                'description' => $desc !== '' ? $desc : null,
                'path' => '/admin/users/'.$row->id,
                'image_url' => null,
            ];
        }

        return $out;
    }

    /** @return list<array{kind: string, id: string, label: string, description: ?string, path: string, image_url: ?string}> */
    private function searchRoutes(string $q): array
    {
        $needle = '%'.$this->escapeLike($q).'%';
        $query = OperationalRoute::query()
            ->with('driver:id,name')
            ->where(function ($sub) use ($q, $needle): void {
                $sub->where('name', 'like', $needle)
                    ->orWhere('coverage_city', 'like', $needle)
                    ->orWhereHas('driver', fn ($d) => $d->where('name', 'like', $needle));
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            })
            ->orderBy('name')
            ->limit(self::LIMIT_PER_TYPE);

        $out = [];
        foreach ($query->get() as $row) {
            if (! Gate::allows('view', $row)) {
                continue;
            }
            $date = $row->scheduled_date?->format('Y-m-d') ?? '—';
            $driver = $row->driver?->name;
            $name = $row->name ?? 'Route';
            $out[] = [
                'kind' => 'route',
                'id' => (string) $row->id,
                'label' => $name.' · '.$date,
                'description' => trim(implode(' · ', array_filter([$row->route_status?->value, $driver, $row->coverage_city]))) ?: null,
                'path' => '/admin/routes/'.$row->id,
                'image_url' => null,
            ];
        }

        return $out;
    }

    /** @return list<array{kind: string, id: string, label: string, description: ?string, path: string, image_url: ?string}> */
    private function searchContacts(string $q): array
    {
        $needle = '%'.$this->escapeLike($q).'%';
        $query = Contact::query()
            ->with('company:id,name')
            ->whereNull('archived_at')
            ->where(function ($sub) use ($q, $needle): void {
                $sub->where('first_name', 'like', $needle)
                    ->orWhere('last_name', 'like', $needle)
                    ->orWhere('email', 'like', $needle)
                    ->orWhere('phone', 'like', $needle)
                    ->orWhereHas('company', fn ($c) => $c->where('name', 'like', $needle));
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            })
            ->orderBy('last_name')
            ->limit(self::LIMIT_PER_TYPE);

        $out = [];
        foreach ($query->get() as $row) {
            if ($row->company === null) {
                continue;
            }
            if (! Gate::allows('view', $row->company)) {
                continue;
            }
            $name = trim($row->first_name.' '.$row->last_name);
            $account = $row->company->name;
            $out[] = [
                'kind' => 'contact',
                'id' => (string) $row->id,
                'label' => $name !== '' ? $name : ($row->email ?? 'Contact'),
                'description' => trim(implode(' · ', array_filter([$row->email, $row->phone, $account]))) ?: null,
                'path' => '/admin/crm/'.$row->company_id,
                'image_url' => null,
            ];
        }

        return $out;
    }

    /** @return list<array{kind: string, id: string, label: string, description: ?string, path: string, image_url: ?string}> */
    private function searchLocations(string $q): array
    {
        $needle = '%'.$this->escapeLike($q).'%';
        $query = CompanyLocation::query()
            ->with('company:id,name')
            ->whereNull('archived_at')
            ->where(function ($sub) use ($q, $needle): void {
                $sub->where('label', 'like', $needle)
                    ->orWhere('city', 'like', $needle)
                    ->orWhere('line_one', 'like', $needle)
                    ->orWhere('postcode', 'like', $needle)
                    ->orWhereHas('company', fn ($c) => $c->where('name', 'like', $needle));
                if (Str::isUuid($q)) {
                    $sub->orWhere('id', $q);
                }
            })
            ->orderBy('label')
            ->limit(self::LIMIT_PER_TYPE);

        $out = [];
        foreach ($query->get() as $row) {
            if ($row->company === null) {
                continue;
            }
            if (! Gate::allows('view', $row->company)) {
                continue;
            }
            $account = $row->company->name;
            $city = $row->city;
            $out[] = [
                'kind' => 'location',
                'id' => (string) $row->id,
                'label' => $row->label,
                'description' => trim(implode(' · ', array_filter([$city, $account]))) ?: null,
                'path' => '/admin/crm/'.$row->company_id,
                'image_url' => null,
            ];
        }

        return $out;
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    /** @param  Collection<int, UploadedFile>  $files */
    private function publicImageUrlFromUploadedFiles(Collection $files): ?string
    {
        $f = $files->first();

        return $f instanceof UploadedFile ? $this->publicImageUrlFromFile($f) : null;
    }

    private function publicImageUrlFromFile(UploadedFile $file): ?string
    {
        $mime = (string) $file->mime_type;
        if ($mime === '' || ! str_starts_with($mime, 'image/')) {
            return null;
        }
        if ($file->disk !== 'public') {
            return null;
        }

        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk('public');
        $url = $disk->url($file->path);

        return $url !== '' ? $url : null;
    }
}
