<?php

declare(strict_types=1);

return [
    /**
     * Browser URL for the customer portal (Next.js app).
     * Email links should point here, not the API origin.
     */
    'customer_portal_base_url' => rtrim((string) env('FRONTEND_URL', env('APP_URL', 'http://localhost')), '/'),

    /** Days before due date to send a single “due soon” reminder (Sent invoices only). */
    'invoice_due_soon_days' => (int) env('INVOICE_DUE_SOON_DAYS', 3),

    /** Days before subscription renews_at to email “renewal upcoming” (Active subscriptions only). */
    'subscription_renewal_reminder_days' => (int) env('SUBSCRIPTION_RENEWAL_REMINDER_DAYS', 7),

    /**
     * Days before renews_at to send a period usage summary (0 disables).
     * Uses OrderSubscriptionCoverageService usage totals — not a replacement for invoice/billing webhooks.
     */
    'subscription_period_summary_days_before_renewal' => (int) env('SUBSCRIPTION_PERIOD_SUMMARY_DAYS_BEFORE_RENEWAL', 1),
];
