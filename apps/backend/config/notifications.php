<?php

return [
    /**
     * Global kill-switch for outbound notifications. When disabled, the system
     * records `notification_deliveries` rows as `skipped` but does not send.
     *
     * Default: false outside production; true in production (unless explicitly disabled).
     */
    'enabled' => env('NOTIFICATIONS_ENABLED', env('APP_ENV') === 'production'),

    /**
     * Email notifications.
     */
    'email' => [
        /**
         * When true, email notifications are queued by default (jobs table).
         */
        'queue' => env('NOTIFICATIONS_EMAIL_QUEUE', true),
        /**
         * Queue name for notification jobs.
         */
        'queue_name' => env('NOTIFICATIONS_QUEUE', 'notifications'),
    ],
];

