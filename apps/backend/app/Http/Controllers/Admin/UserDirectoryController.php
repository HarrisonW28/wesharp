<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\ActivateDirectoryUserAction;
use App\Actions\Admin\DeactivateDirectoryUserAction;
use App\Actions\Admin\RequestUserInvitePlaceholderAction;
use App\Actions\Admin\UpdateDirectoryUserAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminUpdateUserRequest;
use App\Http\Resources\AdminUserDetailResource;
use App\Http\Resources\AdminUserDirectoryRowResource;
use App\Models\User;
use App\Queries\Admin\UserDirectoryIndexQuery;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class UserDirectoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $perPage = min(75, max(1, (int) $request->query('per_page', 25)));

        $q = UserDirectoryIndexQuery::applyFilters(UserDirectoryIndexQuery::base(), $request);
        $paginator = $q->paginate($perPage)->withQueryString();

        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(function (User $u): array {
            return (new AdminUserDirectoryRowResource($u))->toArray(request());
        });

        return ApiResponses::paginated($paginator, 'items');
    }

    public function show(Request $request, User $target): JsonResponse
    {
        $this->authorize('view', $target);

        return ApiResponses::success((new AdminUserDetailResource($target))->toArray($request));
    }

    public function update(AdminUpdateUserRequest $request, User $target, UpdateDirectoryUserAction $action): JsonResponse
    {
        $this->authorize('update', $target);

        $updated = $action->execute($request->user(), $target, $request->validated(), $request);

        return ApiResponses::success([
            'id' => (string) $updated->id,
            'role' => $updated->resolvedRole()->value,
            'status' => $updated->status?->value,
            'company_id' => $updated->company_id !== null ? (string) $updated->company_id : null,
        ]);
    }

    public function deactivate(Request $request, User $target, DeactivateDirectoryUserAction $action): JsonResponse
    {
        $this->authorize('update', $target);

        $target = $action->execute($request->user(), $target, $request);

        return ApiResponses::success(['status' => $target->status?->value]);
    }

    public function activate(Request $request, User $target, ActivateDirectoryUserAction $action): JsonResponse
    {
        $this->authorize('update', $target);

        $target = $action->execute($request->user(), $target, $request);

        return ApiResponses::success(['status' => $target->status?->value]);
    }

    public function invitePlaceholder(Request $request, User $target, RequestUserInvitePlaceholderAction $action): JsonResponse
    {
        $this->authorize('update', $target);

        $action->execute($request->user(), $target, $request);

        return ApiResponses::success([
            'message' => 'Invite/resend is not wired yet; request was logged for audit.',
        ]);
    }
}
