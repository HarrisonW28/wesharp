<?php

namespace App\Http\Controllers\Public;

use App\Actions\Public\CreatePublicContactEnquiryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StorePublicContactEnquiryRequest;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class PublicContactEnquiryController extends Controller
{
    public function store(
        StorePublicContactEnquiryRequest $request,
        CreatePublicContactEnquiryAction $action,
    ): JsonResponse {
        $payload = $action->execute($request->validated(), $request);

        return ApiResponses::success($payload, 201);
    }
}
