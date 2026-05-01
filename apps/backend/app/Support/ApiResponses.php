<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\MessageBag;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

final class ApiResponses
{
    public static function requestId(): ?string
    {
        return Context::get('request_id');
    }

    public static function success(mixed $data = null, int $status = 200): JsonResponse
    {
        $payload = [
            'success' => true,
            'meta' => self::baseMeta(),
        ];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        return response()->json($payload, $status);
    }

    /**
     * @param  array<string, mixed>  $extraMeta
     */
    public static function successWithMeta(array $extraMeta, mixed $data = null, int $status = 200): JsonResponse
    {
        $payload = [
            'success' => true,
            'meta' => array_merge(self::baseMeta(), $extraMeta),
        ];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        return response()->json($payload, $status);
    }

    /**
     * @param  array<string, mixed|string>  $details
     */
    public static function unauthorized(string $message = 'Authentication required.', string $code = 'unauthenticated'): JsonResponse
    {
        return self::error($message, $code, SymfonyResponse::HTTP_UNAUTHORIZED);
    }

    public static function forbidden(string $message = 'You are not allowed to perform this action.', string $code = 'forbidden'): JsonResponse
    {
        return self::error($message, $code, SymfonyResponse::HTTP_FORBIDDEN);
    }

    public static function error(
        string $message,
        string $code = 'error',
        int $status = SymfonyResponse::HTTP_BAD_REQUEST,
        array $details = [],
    ): JsonResponse {
        $error = ['code' => $code, 'message' => $message];

        if ($details !== []) {
            $error['details'] = $details;
        }

        return response()->json([
            'success' => false,
            'error' => $error,
            'meta' => self::baseMeta(),
        ], $status);
    }

    public static function paginated(Paginator $paginator, string $collectionKey = 'items'): JsonResponse
    {
        $items = collect($paginator->items())->values()->all();

        $pagination = [
            'page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
        ];

        if ($paginator instanceof LengthAwarePaginator) {
            $pagination['total'] = $paginator->total();
            $pagination['total_pages'] = (int) max(1, ceil($paginator->total() / max(1, $paginator->perPage())));
            $pagination['has_more_pages'] = $paginator->hasMorePages();
        }

        return response()->json([
            'success' => true,
            'data' => [
                $collectionKey => $items,
            ],
            'meta' => array_merge(self::baseMeta(), ['pagination' => $pagination]),
        ]);
    }

    /**
     * @param  ValidationException|MessageBag|array<string, array<int, string|string[]>>  $errors
     */
    public static function validationError(
        mixed $errors,
        string $message = 'Validation failed.',
        int $status = SymfonyResponse::HTTP_UNPROCESSABLE_ENTITY,
    ): JsonResponse {
        $errs = match (true) {
            $errors instanceof ValidationException => $errors->errors(),
            $errors instanceof MessageBag => $errors->toArray(),
            is_array($errors) => $errors,
            default => [],
        };

        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'validation_error',
                'message' => $message,
                'errors' => $errs,
            ],
            'meta' => self::baseMeta(),
        ], $status);
    }

    /** @return array<string, mixed> */
    private static function baseMeta(): array
    {
        $rid = self::requestId();

        return [
            'timestamp' => now()->utc()->format(DATE_ATOM),
            ...((is_string($rid) && $rid !== '') ? ['request_id' => $rid] : []),
        ];
    }
}
