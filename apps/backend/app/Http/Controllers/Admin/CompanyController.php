<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Companies\BuildCompaniesIndexQuery;
use App\Enums\BookingStatus;
use App\Enums\CompanyStatus;
use App\Enums\ServiceType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCompanyBookingRequest;
use App\Http\Requests\StoreCompanyLocationRequest;
use App\Http\Requests\StoreCompanyNoteRequest;
use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\StoreContactRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Http\Requests\UpdateCompanyStatusRequest;
use App\Http\Resources\CompanyDetailResource;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\CompanySummaryResource;
use App\Http\Resources\CrmContactResource;
use App\Http\Resources\CrmLocationResource;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Contact;
use App\Models\Note;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Audit\AuditLogPresenter;
use App\Support\Permissions;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CompanyController extends Controller
{
    public function __construct(
        private readonly BuildCompaniesIndexQuery $companyIndexQuery,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Company::class);

        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));

        $query = $this->companyIndexQuery->execute($request);
        $paginator = $query->paginate($perPage)->withQueryString();

        $paginator->getCollection()->transform(
            fn (Company $company): array => (new CompanyResource($company))->toArray($request)
        );

        return ApiResponses::paginated($paginator, 'items');
    }

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        $this->authorize('create', Company::class);

        $data = $request->validated();
        $slug = $this->uniqueSlug($data['slug'] ?? $this->slugFromName($data['name']));

        unset($data['slug']);

        $status = isset($data['company_status'])
            ? CompanyStatus::from($data['company_status'])
            : CompanyStatus::Lead;
        unset($data['company_status']);

        $company = DB::transaction(function () use ($data, $slug, $status, $request): Company {
            /** @var Company $company */
            $company = Company::query()->create(array_merge($data, [
                'slug' => $slug,
                'company_status' => $status,
            ]));

            AuditRecorder::record($request->user(), $company, 'company.created', [
                'name' => $company->name,
                'slug' => $company->slug,
                'company_status' => $company->company_status->value,
            ], $request);

            return $company;
        });

        return ApiResponses::success((new CompanyResource($company))->toArray($request), 201);
    }

    public function show(Request $request, Company $company): JsonResponse
    {
        $this->authorize('view', $company);

        $company->load([
            'subscription.plan',
            'subscriptions' => fn ($q) => $q->with(['plan', 'billingContact'])->limit(50),
            'users' => fn ($q) => $q->orderBy('name')->limit(100),
            'contacts' => fn ($q) => $q
                ->orderByRaw('CASE WHEN archived_at IS NULL THEN 0 ELSE 1 END')
                ->orderByDesc('billing_contact')
                ->orderBy('last_name')
                ->orderBy('first_name'),
            'locations' => fn ($q) => $q
                ->orderByRaw('CASE WHEN archived_at IS NULL THEN 0 ELSE 1 END')
                ->orderByDesc('is_default')
                ->orderBy('label'),
            'bookings' => fn ($q) => $q->with([
                'location:id,label,line_one,city,postcode,archived_at',
                'contact:id,first_name,last_name,email,archived_at',
            ])->latest('scheduled_date')->limit(75),
            'notes' => fn ($q) => $q->with('author:id,name')->latest()->limit(75),
            'orders' => fn ($q) => $q->latest()->limit(50),
            'knives' => fn ($q) => $q->latest()->limit(60),
            'invoices' => fn ($q) => $q->latest('issued_on')->limit(60),
        ]);

        return ApiResponses::success((new CompanyDetailResource($company))->resolve());
    }

    public function summary(Request $request, Company $company): JsonResponse
    {
        $this->authorize('view', $company);

        return ApiResponses::success((new CompanySummaryResource($company))->toArray($request));
    }

    public function activity(Request $request, Company $company): JsonResponse
    {
        $this->authorize('view', $company);

        $audits = AuditLog::query()
            ->with('actor:id,name')
            ->where('auditable_type', Company::class)
            ->where('auditable_id', $company->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $timelineNotes = Note::query()
            ->with('author:id,name')
            ->where('noteable_type', Company::class)
            ->where('noteable_id', $company->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $combined = [];

        foreach ($audits as $row) {
            $combined[] = array_merge(
                ['type' => 'audit'],
                AuditLogPresenter::toArray($row, includeIp: true),
            );
        }

        foreach ($timelineNotes as $row) {
            $combined[] = [
                'type' => 'note',
                'id' => $row->id,
                'at' => $row->created_at?->toIso8601String(),
                'action' => 'note.created',
                'actor_name' => $row->author?->name,
                'body' => $row->body,
            ];
        }

        usort($combined, static fn (array $a, array $b): int => strtotime((string) ($b['at'] ?? '0')) <=> strtotime((string) ($a['at'] ?? '0')));

        return ApiResponses::success(['items' => array_slice($combined, 0, 120)]);
    }

    public function update(UpdateCompanyRequest $request, Company $company): JsonResponse
    {
        $this->authorize('update', $company);

        $validated = $request->validated();
        $before = $company->only(array_keys($validated));

        $company->fill($validated);

        if ($company->isDirty()) {
            $company->save();

            AuditRecorder::record($request->user(), $company, 'company.updated', [
                'before' => $before,
                'after' => $company->only(array_merge(array_keys($before), [
                    'name',
                    'slug',
                    'city',
                    'phone',
                    'billing_email',
                    'company_status',
                ])),
            ], $request);
        }

        return ApiResponses::success((new CompanyResource($company->fresh()))->toArray($request));
    }

    public function updateStatus(UpdateCompanyStatusRequest $request, Company $company): JsonResponse
    {
        $this->authorize('update', $company);

        $next = CompanyStatus::from($request->validated('company_status'));

        AuditRecorder::record($request->user(), $company, 'company.status_changed', [
            'from' => $company->company_status->value,
            'to' => $next->value,
        ], $request);

        $company->company_status = $next;
        $company->save();

        return ApiResponses::success((new CompanyResource($company))->toArray($request));
    }

    public function destroy(Request $request, Company $company): Response
    {
        $this->authorize('delete', $company);

        AuditRecorder::record($request->user(), $company, 'company.deleted', [
            'name' => $company->name,
        ], $request);

        $company->delete();

        return response()->noContent();
    }

    public function storeNote(StoreCompanyNoteRequest $request, Company $company): JsonResponse
    {
        $this->authorize('update', $company);

        $note = DB::transaction(function () use ($request, $company): Note {
            $note = Note::query()->create([
                'noteable_type' => Company::class,
                'noteable_id' => $company->id,
                'author_id' => $request->user()?->getAuthIdentifier(),
                'body' => $request->validated('body'),
            ]);

            AuditRecorder::record($request->user(), $company, 'company.note_added', [
                'note_id' => $note->id,
            ], $request);

            return $note;
        });

        return ApiResponses::success([
            'id' => $note->id,
            'body' => $note->body,
            'created_at' => $note->created_at?->toIso8601String(),
        ], 201);
    }

    public function storeContact(StoreContactRequest $request, Company $company): JsonResponse
    {
        $this->authorize('update', $company);

        $contact = Contact::query()->create(array_merge(
            ['company_id' => $company->id],
            $request->validated()
        ));

        AuditRecorder::record($request->user(), $company, 'company.contact_added', [
            'contact_id' => $contact->id,
        ], $request);

        return ApiResponses::success((new CrmContactResource($contact))->resolve(), 201);
    }

    public function storeLocation(StoreCompanyLocationRequest $request, Company $company): JsonResponse
    {
        $this->authorize('update', $company);

        $location = CompanyLocation::query()->create(array_merge(
            ['company_id' => $company->id],
            $request->validated()
        ));

        AuditRecorder::record($request->user(), $company, 'company.location_added', [
            'location_id' => $location->id,
        ], $request);

        return ApiResponses::success((new CrmLocationResource($location))->resolve(), 201);
    }

    public function storeBooking(StoreCompanyBookingRequest $request, Company $company): JsonResponse
    {
        $this->authorize('view', $company);

        if (! Permissions::userMay($request->user(), Permissions::BOOKINGS_CREATE)) {
            abort(403);
        }

        $data = $request->validated();

        $booking = Booking::query()->create([
            'company_id' => $company->id,
            'company_location_id' => $data['company_location_id'],
            'booking_status' => BookingStatus::Requested,
            'service_type' => ServiceType::from($data['service_type']),
            'scheduled_date' => CarbonImmutable::parse($data['scheduled_date']),
            'internal_notes' => $data['internal_notes'] ?? null,
        ]);

        AuditRecorder::record($request->user(), $company, 'company.booking_created', [
            'booking_id' => $booking->id,
        ], $request);

        return ApiResponses::success([
            'id' => (string) $booking->id,
            'scheduled_date' => $booking->scheduled_date->format('Y-m-d'),
            'booking_status' => $booking->booking_status->value,
            'service_type' => $booking->service_type->value,
            'company_location_id' => (string) $booking->company_location_id,
        ], 201);
    }

    private function slugFromName(string $name): string
    {
        return Str::slug($name.'-'.Str::lower(Str::random(4)), '-');
    }

    private function uniqueSlug(string $base): string
    {
        $slug = Str::substr($base, 0, 248);
        $candidate = $slug;
        $i = 2;
        while (Company::query()->where('slug', $candidate)->exists()) {
            $candidate = Str::substr($slug, 0, 240).'-'.$i++;
        }

        return $candidate;
    }
}
