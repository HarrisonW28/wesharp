<?php

namespace App\Support\Http;

/**
 * Central rules for multipart uploads when HTTP endpoints are added (knife photos, company assets, etc.).
 * Use FormRequest classes that compose these arrays — never trust client Content-Type alone.
 */
final class ValidatedAttachmentRules
{
    public const int DEFAULT_MAX_KIB = 6144;

    /** @return array<string, mixed> */
    public static function imageField(string $field = 'file', int $maxKib = self::DEFAULT_MAX_KIB): array
    {
        return [
            $field => [
                'required',
                'file',
                'max:'.max(1, $maxKib),
                'mimetypes:image/jpeg,image/png,image/webp',
            ],
        ];
    }

    /** @return array<string, mixed> */
    public static function optionalImageField(string $field = 'file', int $maxKib = self::DEFAULT_MAX_KIB): array
    {
        return [
            $field => [
                'nullable',
                'file',
                'max:'.max(1, $maxKib),
                'mimetypes:image/jpeg,image/png,image/webp',
            ],
        ];
    }

    /** @return array<string, mixed> */
    public static function pdfField(string $field = 'file', int $maxKib = 5120): array
    {
        return [
            $field => [
                'required',
                'file',
                'max:'.max(1, $maxKib),
                'mimetypes:application/pdf',
            ],
        ];
    }
}
