<?php

declare(strict_types=1);

return [
    /*
    | When true, mark-collected (etc.) returns 422 until a non-archived photo of the
    | matching category exists for the stop. Photos must be uploaded first.
    */
    'require_collection_photo' => (bool) env('EVIDENCE_REQUIRE_COLLECTION_PHOTO', false),
    'require_return_photo' => (bool) env('EVIDENCE_REQUIRE_RETURN_PHOTO', false),
    'require_failed_collection_photo' => (bool) env('EVIDENCE_REQUIRE_FAILED_COLLECTION_PHOTO', false),

    /** Default for new uploads: internal_only | customer_visible */
    'default_visibility' => env('EVIDENCE_DEFAULT_VISIBILITY', 'internal_only'),

    'allow_customer_visible_photos' => (bool) env('EVIDENCE_ALLOW_CUSTOMER_VISIBLE', true),

    'show_in_customer_portal' => (bool) env('EVIDENCE_SHOW_IN_CUSTOMER_PORTAL', true),
];
