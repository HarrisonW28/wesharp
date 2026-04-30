<?php

$explicitOrigins = [];

foreach (['CORS_ALLOWED_ORIGINS', 'FRONTEND_ORIGIN'] as $envKey) {
    $raw = env($envKey);
    if (! is_string($raw) || trim($raw) === '') {
        continue;
    }
    foreach (explode(',', $raw) as $part) {
        $o = rtrim(trim($part), '/');
        if ($o !== '') {
            $explicitOrigins[] = $o;
        }
    }
}

$explicitOrigins = array_values(array_unique($explicitOrigins));

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    | When FRONTEND_ORIGIN or CORS_ALLOWED_ORIGINS is set, only those origins
    | receive Access-Control-Allow-Origin. Otherwise (*) all origins are allowed.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $explicitOrigins !== [] ? $explicitOrigins : ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
