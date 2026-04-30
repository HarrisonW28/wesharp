<?php

namespace App\Http\Controllers\Public;

use App\Actions\Public\CreatePublicBookingEnquiryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StorePublicBookingEnquiryRequest;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class PublicBookingEnquiryController extends Controller
{
    public function store(
        StorePublicBookingEnquiryRequest $request,
        CreatePublicBookingEnquiryAction $action,
    ): JsonResponse {
        $payload = $action->execute($request->validated(), $request);

        return ApiResponses::success($payload, 201);
    }
}
