<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Companies\ResendCustomerPortalInviteAction;
use App\Actions\Companies\SendCustomerPortalInviteAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCustomerPortalInviteRequest;
use App\Http\Resources\CustomerPortalInviteResource;
use App\Models\Company;
use App\Models\CustomerPortalInvite;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CompanyPortalInviteController extends Controller
{
    public function store(
        StoreCustomerPortalInviteRequest $request,
        Company $company,
        SendCustomerPortalInviteAction $send,
    ): JsonResponse {
        $this->authorize('update', $company);

        [$invite, $wasNew] = $send->execute(
            $company,
            (string) $request->validated('email'),
            $request->user(),
            $request,
            false,
        );

        $status = $wasNew ? 201 : 200;

        return ApiResponses::success([
            'invite' => (new CustomerPortalInviteResource($invite))->resolve(),
        ], $status);
    }

    public function resend(
        Request $request,
        Company $company,
        CustomerPortalInvite $invite,
        ResendCustomerPortalInviteAction $resend,
    ): JsonResponse {
        $this->authorize('update', $company);

        if ((string) $invite->company_id !== (string) $company->id) {
            abort(404);
        }

        $fresh = $resend->execute($invite, $request->user(), $request);

        return ApiResponses::success([
            'invite' => (new CustomerPortalInviteResource($fresh))->resolve(),
        ]);
    }
}
