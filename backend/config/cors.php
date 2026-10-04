<?php

$configuredOrigins = env(
    'CORS_ALLOWED_ORIGINS',
    env('FRONTEND_URL', 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173')
);

$allowedOrigins = array_values(array_filter(array_map('trim', explode(',', (string)$configuredOrigins))));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string)env('CORS_ALLOWED_ORIGIN_PATTERNS', ''))
    ))),

    'allowed_headers' => [
        'Content-Type',
        'X-Requested-With',
        'Authorization',
        'Accept',
        'Origin',
        'X-XSRF-TOKEN',
        'Idempotency-Key',
        'X-Idempotency-Key',
        'Stripe-Signature',
    ],

    'exposed_headers' => ['Idempotency-Key', 'X-Idempotency-Key'],

    'max_age' => 86400,

    'supports_credentials' => (bool) env('CORS_SUPPORTS_CREDENTIALS', true),

];

