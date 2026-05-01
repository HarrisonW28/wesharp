<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Knives\MarkKnifeInspectedAction;
use App\Actions\Knives\MarkKnifeQualityCheckedAction;
use App\Actions\Knives\MarkKnifeReturnedAction;
use App\Actions\Knives\MarkKnifeSharpenedAction;
use App\Actions\Knives\RecordKnifeInspectionAction;
use App\Actions\Knives\ReportKnifeIssueAction;
use App\Actions\Knives\TransitionKnifeStatusAction;
use App\Enums\KnifeStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\RecordKnifeInspectionRequest;
use App\Http\Requests\ReportKnifeIssueRequest;
use App\Http\Requests\TransitionKnifeRequest;
use App\Http\Requests\StoreKnifePhotoRequest;
use App\Http\Requests\StoreKnifeRequest;
use App\Http\Requests\UpdateKnifeRequest;
use App\Models\Booking;
use App\Models\Knife;
use App\Models\KnifePhoto;
use App\Models\Order;
use App\Models\UploadedFile;
use App\Services\Audit\AuditRecorder;
use App\Services\Knives\KnifeService;
use App\Services\Orders\OrderService;
use App\Support\ApiResponses;
use App\Support\Knives\KnifeJson;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class KnifeController extends Controller
{
    public function __construct(
        private readonly KnifeService $knifeService,
        private readonly OrderService $orderService,
        private readonly MarkKnifeInspectedAction $markKnifeInspectedAction,
        private readonly MarkKnifeSharpenedAction $markKnifeSharpenedAction,
        private readonly MarkKnifeQualityCheckedAction $markKnifeQualityCheckedAction,
        private readonly MarkKnifeReturnedAction $markKnifeReturnedAction,
        private readonly ReportKnifeIssueAction $reportKnifeIssueAction,
        private readonly TransitionKnifeStatusAction $transitionKnifeStatusAction,
        private readonly RecordKnifeInspectionAction $recordKnifeInspectionAction,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Knife::class);

        $paginator = $this->knifeService->paginate($request);

        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(
            fn (Knife $k): array => KnifeJson::summary($k)
        );

        return ApiResponses::paginated($paginator, 'items');
    }

    public function store(StoreKnifeRequest $request): JsonResponse
    {
        /** @phpstan-ignore-next-line */
        $validated = $request->validated();
        /** @phpstan-ignore-next-line */
        $orderId = $validated['order_id'] ?? null;

        if ($orderId !== null && $orderId !== '') {
            /** @phpstan-ignore-next-line */
            $order = Order::query()->findOrFail($orderId);

            $this->authorize('manipulateKnives', $order);

            unset($validated['order_id'], $validated['company_id']);

            /** @phpstan-ignore-next-line */
            $knife = $this->orderService->addKnife($order->fresh(['company_id', 'booking_id']), $validated, $request->user(), $request);

            return ApiResponses::success(KnifeJson::detail($knife), 201);
        }

        /** @phpstan-ignore-next-line */
        $companyId = (string) $validated['company_id'];
        $this->authorize('create', Knife::class);

        $user = $request->user();
        if ($user === null || ! Permissions::userMayForCompany($user, Permissions::KNIVES_UPDATE, $companyId)) {
            abort(403);
        }

        /** @phpstan-ignore-next-line */
        $bookingId = $validated['booking_id'] ?? null;
        if ($bookingId !== null && $bookingId !== '') {
            /** @phpstan-ignore-next-line */
            $booking = Booking::query()->findOrFail($bookingId);
            if ((string) $booking->company_id !== $companyId) {
                abort(422, 'Booking does not belong to the selected customer company.');
            }
        }

        unset($validated['order_id'], $validated['company_id']);

        /** @phpstan-ignore-next-line */
        $knife = $this->knifeService->createStandalone($companyId, $validated);

        AuditRecorder::record($request->user(), $knife, 'knife.registered_inventory', [
            /** @phpstan-ignore-next-line */
            'company_id' => (string) $knife->company_id,
            /** @phpstan-ignore-next-line */
            'tag_id' => $knife->tag_id,
        ], $request);

        return ApiResponses::success(KnifeJson::detail($knife), 201);
    }

    public function show(Request $request, Knife $knife): JsonResponse
    {
        $this->authorize('view', $knife);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function update(UpdateKnifeRequest $request, Knife $knife): JsonResponse
    {
        $this->authorize('update', $knife);

        $knife = $this->knifeService->updateAttributes($knife, $request->validated(), $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function transition(TransitionKnifeRequest $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        $target = KnifeStatus::from($request->validated('target_status'));
        /** @var string|null $note */
        $note = $request->validated('note');
        $knife = $this->transitionKnifeStatusAction->execute($knife, $target, $request->user(), $request, $note);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function markInspected(Request $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        $knife = $this->markKnifeInspectedAction->execute($knife, $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function recordInspection(RecordKnifeInspectionRequest $request, Knife $knife): JsonResponse
    {
        $this->authorize('update', $knife);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $knife = $this->recordKnifeInspectionAction->execute($knife, $request->validated(), $user, $request);
        $knife->loadMissing(KnifeJson::detailEagerLoadRelations());

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function markSharpened(Request $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        $knife = $this->markKnifeSharpenedAction->execute($knife, $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function markQualityChecked(Request $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        $knife = $this->markKnifeQualityCheckedAction->execute($knife, $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function markReturned(Request $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        $knife = $this->markKnifeReturnedAction->execute($knife, $request->user(), $request);

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function reportIssue(ReportKnifeIssueRequest $request, Knife $knife): JsonResponse
    {
        $this->authorize('transition', $knife);

        /** @phpstan-ignore-next-line */
        $validated = $request->validated();

        $knife = $this->reportKnifeIssueAction->execute(
            $knife,
            $validated['damage_notes'],
            $request->user(),
            $request,
        );

        return ApiResponses::success(KnifeJson::detail($knife));
    }

    public function storePhoto(StoreKnifePhotoRequest $request, Knife $knife): JsonResponse
    {
        $this->authorize('update', $knife);

        /** @var array{photo: \Illuminate\Http\UploadedFile, caption?: ?string, photo_kind?: ?string, order_id?: ?string} $data */
        $data = $request->validated();

        /** @phpstan-ignore-next-line */
        $file = $request->file('photo');
        /** @phpstan-ignore-next-line */
        $path = $file->store('knife-photos/'.(string) $knife->getKey(), 'local');

        /** @phpstan-ignore-next-line */
        $uploaded = UploadedFile::query()->create([
            'fileable_type' => Knife::class,
            /** @phpstan-ignore-next-line */
            'fileable_id' => $knife->id,
            'disk' => 'local',
            'path' => $path,
            /** @phpstan-ignore-next-line */
            'original_filename' => $file->getClientOriginalName(),
            /** @phpstan-ignore-next-line */
            'mime_type' => (string) $file->getMimeType(),
            /** @phpstan-ignore-next-line */
            'byte_size' => (int) $file->getSize(),
        ]);

        /** @phpstan-ignore-next-line */
        $nextOrder = (int) (KnifePhoto::query()->where('knife_id', $knife->id)->max('sort_order') ?? 0) + 1;

        /** @phpstan-ignore-next-line */
        $orderId = isset($data['order_id']) && $data['order_id'] !== null && $data['order_id'] !== ''
            ? $data['order_id']
            : $knife->order_id;

        /** @phpstan-ignore-next-line */
        $photoKind = isset($data['photo_kind']) && is_string($data['photo_kind']) && $data['photo_kind'] !== ''
            ? $data['photo_kind']
            : 'general';

        /** @phpstan-ignore-next-line */
        KnifePhoto::query()->create([
            /** @phpstan-ignore-next-line */
            'knife_id' => $knife->id,
            /** @phpstan-ignore-next-line */
            'order_id' => $orderId,
            /** @phpstan-ignore-next-line */
            'uploaded_file_id' => $uploaded->id,
            /** @phpstan-ignore-next-line */
            'uploaded_by_user_id' => $request->user()?->getAuthIdentifier(),
            'sort_order' => $nextOrder,
            'caption' => $data['caption'] ?? null,
            'photo_kind' => $photoKind,
        ]);

        AuditRecorder::record($request->user(), $knife, 'knife.photo_added', [
            /** @phpstan-ignore-next-line */
            'stored_path' => $path,
            'disk' => 'local',
            'photo_kind' => $photoKind,
            /** @phpstan-ignore-next-line */
            'order_id' => $orderId !== null ? (string) $orderId : null,
            /** @phpstan-ignore-next-line */
            'uploaded_by_user_id' => $request->user()?->getAuthIdentifier(),
        ], $request);

        $knife->refresh();
        /** @phpstan-ignore-next-line */
        $knife->load(['photos' => fn ($q) => $q->orderBy('sort_order')->with(['uploadedFile', 'uploadedBy:id,name'])]);

        return ApiResponses::success(KnifeJson::detail($knife), 201);
    }

    public function showPhotoFile(KnifePhoto $photo): StreamedResponse
    {
        $photo->loadMissing(['knife', 'uploadedFile']);

        /** @phpstan-ignore-next-line */
        $knife = $photo->knife;
        /** @phpstan-ignore-next-line */
        $uploaded = $photo->uploadedFile;

        if ($knife === null || $uploaded === null) {
            abort(404);
        }

        $this->authorize('view', $knife);

        /** @phpstan-ignore-next-line */
        if (! Storage::disk((string) $uploaded->disk)->exists((string) $uploaded->path)) {
            abort(404);
        }

        /** @phpstan-ignore-next-line */
        return Storage::disk((string) $uploaded->disk)->response(
            (string) $uploaded->path,
            (string) $uploaded->original_filename,
            [
                /** @phpstan-ignore-next-line */
                'Content-Type' => (string) ($uploaded->mime_type ?? 'application/octet-stream'),
                'Cache-Control' => 'private, max-age=0, must-revalidate',
            ]
        );
    }

    public function destroyPhoto(Request $request, Knife $knife, KnifePhoto $photo): JsonResponse
    {
        if ((string) $photo->knife_id !== (string) $knife->id) {
            abort(404);
        }

        $this->authorize('update', $knife);

        $photo->loadMissing('uploadedFile');

        /** @phpstan-ignore-next-line */
        $uploaded = $photo->uploadedFile;
        /** @phpstan-ignore-next-line */
        $photoId = (string) $photo->id;

        $photo->delete();

        if ($uploaded !== null) {
            /** @phpstan-ignore-next-line */
            Storage::disk((string) $uploaded->disk)->delete((string) $uploaded->path);
            $uploaded->delete();
        }

        AuditRecorder::record($request->user(), $knife, 'knife.photo_removed', [
            'knife_photo_id' => $photoId,
        ], $request);

        $knife->refresh();
        /** @phpstan-ignore-next-line */
        $knife->load(['photos' => fn ($q) => $q->orderBy('sort_order')->with(['uploadedFile', 'uploadedBy:id,name'])]);

        return ApiResponses::success(KnifeJson::detail($knife));
    }
}
