<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class EnsureCorrelationId
{
    public const ATTRIBUTE = '_request_id';

    public function handle(Request $request, Closure $next): Response
    {
        $incoming = $request->headers->get('X-Request-ID')
            ?? $request->headers->get('X-Correlation-ID');

        $id = (is_string($incoming) && $incoming !== '')
            ? $incoming
            : (string) Str::uuid();

        $request->attributes->set(self::ATTRIBUTE, $id);

        Context::add('request_id', $id);

        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Request-ID', $id);

        return $response;
    }
}
