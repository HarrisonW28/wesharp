<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\BillingInterval;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpsertSubscriptionPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'public_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'public_description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'billing_interval' => ['required', 'string', Rule::in(array_map(static fn (BillingInterval $i) => $i->value, BillingInterval::cases()))],
            'price_amount_minor' => ['required', 'integer', 'min:0', 'max:1000000000'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'included_collections' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000000'],
            'included_knife_allowance' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000000'],
            'overage_price_amount_minor' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000000000'],
            'is_active' => ['sometimes', 'boolean'],
            'show_on_public_site' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'public_highlights' => ['sometimes', 'nullable', 'array', 'max:12'],
            'public_highlights.*' => ['string', 'max:200'],
            'public_cta_label' => ['sometimes', 'nullable', 'string', 'max:80'],
            'recommended' => ['sometimes', 'boolean'],
            'stripe_price_id' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    /** @return array<string, mixed> */
    public function planPayload(): array
    {
        /** @var array<string, mixed> $v */
        $v = $this->validated();

        $currency = isset($v['currency']) && is_string($v['currency']) && $v['currency'] !== ''
            ? strtoupper($v['currency'])
            : 'GBP';

        $payload = [
            'name' => trim((string) $v['name']),
            'public_name' => array_key_exists('public_name', $v)
                ? self::normalizePublicName($v['public_name'])
                : null,
            'description' => array_key_exists('description', $v) ? $v['description'] : null,
            'public_description' => array_key_exists('public_description', $v)
                ? self::normalizePublicDescription($v['public_description'])
                : null,
            'billing_interval' => BillingInterval::from((string) $v['billing_interval']),
            'price_amount_minor' => (int) $v['price_amount_minor'],
            'currency' => $currency,
            'included_collections' => array_key_exists('included_collections', $v) ? $v['included_collections'] : null,
            'included_knife_allowance' => array_key_exists('included_knife_allowance', $v) ? $v['included_knife_allowance'] : null,
            'overage_price_amount_minor' => array_key_exists('overage_price_amount_minor', $v) ? $v['overage_price_amount_minor'] : null,
            'is_active' => array_key_exists('is_active', $v) ? (bool) $v['is_active'] : true,
            'show_on_public_site' => array_key_exists('show_on_public_site', $v) ? (bool) $v['show_on_public_site'] : false,
            'sort_order' => array_key_exists('sort_order', $v) ? (int) $v['sort_order'] : 0,
            'public_highlights' => array_key_exists('public_highlights', $v)
                ? self::normalizePublicHighlights($v['public_highlights'])
                : null,
            'public_cta_label' => array_key_exists('public_cta_label', $v)
                ? self::normalizePublicCtaLabel($v['public_cta_label'])
                : null,
            'recommended' => array_key_exists('recommended', $v) ? (bool) $v['recommended'] : false,
        ];

        if (array_key_exists('stripe_price_id', $v)) {
            $payload['stripe_price_id'] = self::normalizeStripePriceId($v['stripe_price_id']);
        }

        return $payload;
    }

    /** @return list<string>|null */
    private static function normalizePublicHighlights(mixed $raw): ?array
    {
        if ($raw === null || $raw === []) {
            return null;
        }
        if (! is_array($raw)) {
            return null;
        }
        /** @var list<string> $out */
        $out = [];
        foreach ($raw as $line) {
            if (! is_string($line)) {
                continue;
            }
            $t = trim($line);
            if ($t === '') {
                continue;
            }
            $out[] = mb_substr($t, 0, 200);
            if (count($out) >= 12) {
                break;
            }
        }

        return $out === [] ? null : $out;
    }

    private static function normalizePublicName(mixed $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        if (! is_string($raw)) {
            return null;
        }
        $t = trim($raw);

        return $t === '' ? null : mb_substr($t, 0, 160);
    }

    private static function normalizePublicDescription(mixed $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        if (! is_string($raw)) {
            return null;
        }
        $t = trim($raw);

        return $t === '' ? null : mb_substr($t, 0, 2000);
    }

    private static function normalizePublicCtaLabel(mixed $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        if (! is_string($raw)) {
            return null;
        }
        $t = trim($raw);

        return $t === '' ? null : mb_substr($t, 0, 80);
    }

    private static function normalizeStripePriceId(mixed $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        if (! is_string($raw)) {
            return null;
        }
        $t = trim($raw);

        return $t === '' ? null : mb_substr($t, 0, 255);
    }
}
