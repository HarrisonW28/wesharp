<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Issuer (shown on customer & admin invoice documents)
    |--------------------------------------------------------------------------
    */
    'issuer' => [
        'legal_name' => env('INVOICE_ISSUER_NAME', 'WeSharp'),
        'address_lines' => array_values(array_filter(array_map(
            'trim',
            explode("\n", (string) env('INVOICE_ISSUER_ADDRESS', "United Kingdom"))
        ))),
        'email' => env('INVOICE_ISSUER_EMAIL'),
        'phone' => env('INVOICE_ISSUER_PHONE'),
        'vat_number' => env('INVOICE_ISSUER_VAT_NUMBER'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Default payment copy (customer-safe; shown below per-invoice customer notes)
    |--------------------------------------------------------------------------
    */
    'default_payment_footer' => env(
        'INVOICE_DEFAULT_PAYMENT_FOOTER',
        'Please pay by bank transfer using the reference above. Contact accounts if you need our bank details or have a query about this invoice.'
    ),

    /*
    | When true, GenerateSubscriptionInvoiceAction may create invoices (Sprint 9 — still requires
    | implemented business logic). Default false: action returns 501 / throws.
    */
    'subscription_invoice_generation_enabled' => filter_var(
        env('INVOICE_SUBSCRIPTION_GENERATION_ENABLED', false),
        FILTER_VALIDATE_BOOL
    ),
];
