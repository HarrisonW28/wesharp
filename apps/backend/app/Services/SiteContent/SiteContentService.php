<?php

declare(strict_types=1);

namespace App\Services\SiteContent;

use App\Models\SiteContentSetting;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Support\SiteContent\SiteContentDefaults;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Schema;
use Throwable;

final class SiteContentService
{
    /** @var array<string, mixed>|null */
    private ?array $resolvedCache = null;

    public function forgetResolved(): void
    {
        $this->resolvedCache = null;
    }

    /**
     * @return array<string, mixed>
     */
    public function resolved(): array
    {
        if ($this->resolvedCache !== null) {
            return $this->resolvedCache;
        }

        $defaults = SiteContentDefaults::all();

        if (! Schema::hasTable('site_content_settings')) {
            return $this->resolvedCache = $defaults;
        }

        try {
            /** @var array<string, mixed>|null $overrides */
            $overrides = SiteContentSetting::query()->first()?->overrides;
            if (! is_array($overrides)) {
                $overrides = [];
            }

            return $this->resolvedCache = $this->deepMerge($defaults, $overrides);
        } catch (Throwable) {
            return $this->resolvedCache = $defaults;
        }
    }

    /**
     * @param  array<string, mixed>  $content  Full tree from admin (validated + sanitised)
     * @return array<string, mixed> Minimal overrides to persist
     */
    public function computeOverrides(array $content): array
    {
        $defaults = SiteContentDefaults::all();

        return $this->diffFromDefaults($defaults, $content);
    }

    /**
     * Drop keys not present in the default schema (prevents stuffing arbitrary JSON).
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function sanitizeToSchema(array $input): array
    {
        $defaults = SiteContentDefaults::all();

        return $this->intersectSchema($defaults, $input);
    }

    /**
     * @param  array<string, mixed>  $defaults
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function deepMerge(array $defaults, array $overrides): array
    {
        $out = $defaults;
        foreach ($overrides as $key => $value) {
            if (! array_key_exists($key, $defaults)) {
                continue;
            }
            $defaultVal = $defaults[$key];
            if (is_array($defaultVal) && is_array($value) && $this->isAssoc($defaultVal) && $this->isAssoc($value)) {
                /** @var array<string, mixed> $defaultVal */
                /** @var array<string, mixed> $value */
                $out[$key] = $this->deepMerge($defaultVal, $value);
            } else {
                $out[$key] = $value;
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $defaults
     * @param  array<string, mixed>  $content
     * @return array<string, mixed>
     */
    private function diffFromDefaults(array $defaults, array $content): array
    {
        $diff = [];
        foreach ($defaults as $key => $defaultVal) {
            if (! array_key_exists($key, $content)) {
                continue;
            }
            $sub = $content[$key];
            if (is_array($defaultVal) && is_array($sub) && $this->isList($defaultVal) && $this->isList($sub)) {
                if (json_encode($defaultVal) !== json_encode($sub)) {
                    $diff[$key] = $sub;
                }

                continue;
            }
            if (is_array($defaultVal) && is_array($sub) && $this->isAssoc($defaultVal) && $this->isAssoc($sub)) {
                /** @var array<string, mixed> $defaultVal */
                /** @var array<string, mixed> $sub */
                $nested = $this->diffFromDefaults($defaultVal, $sub);
                if ($nested !== []) {
                    $diff[$key] = $nested;
                }

                continue;
            }
            if ($sub !== $defaultVal) {
                $diff[$key] = $sub;
            }
        }

        return $diff;
    }

    /**
     * @param  array<string, mixed>  $defaults
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function intersectSchema(array $defaults, array $input): array
    {
        $out = [];
        foreach ($defaults as $key => $defaultVal) {
            if (! array_key_exists($key, $input)) {
                continue;
            }
            $sub = $input[$key];
            if (is_array($defaultVal) && is_array($sub) && $this->isList($defaultVal) && $this->isList($sub)) {
                $template = $defaultVal[0] ?? null;
                if (is_array($template)) {
                    /** @var list<array<string, mixed>> $sanitized */
                    $sanitized = [];
                    foreach ($sub as $row) {
                        if (is_array($row)) {
                            $sanitized[] = $this->intersectSchema($template, $row);
                        }
                    }
                    $out[$key] = $sanitized;
                } else {
                    $out[$key] = array_values(array_filter($sub, static fn ($v): bool => is_string($v)));
                }

                continue;
            }
            if (is_array($defaultVal) && is_array($sub) && $this->isAssoc($defaultVal) && $this->isAssoc($sub)) {
                /** @var array<string, mixed> $defaultVal */
                /** @var array<string, mixed> $sub */
                $out[$key] = $this->intersectSchema($defaultVal, $sub);

                continue;
            }
            $out[$key] = $sub;
        }

        return $out;
    }

    /**
     * @param  array<mixed>  $arr
     */
    private function isList(array $arr): bool
    {
        return array_keys($arr) === range(0, count($arr) - 1);
    }

    /**
     * @param  array<mixed>  $arr
     */
    private function isAssoc(array $arr): bool
    {
        return $arr !== [] && ! $this->isList($arr);
    }

    /**
     * @param  array<string, mixed>  $partialContent
     * @return array<string, mixed>
     */
    public function normalizeSubmitted(array $partialContent): array
    {
        $sanitized = $this->sanitizeToSchema($partialContent);

        return $this->deepMerge(SiteContentDefaults::all(), $sanitized);
    }

    /**
     * @param  array<string, mixed>  $content  Full tree (defaults merged with submission)
     */
    public function saveFullContentTree(array $content, ?Authenticatable $actor, ?Request $request): SiteContentSetting
    {
        if (! Schema::hasTable('site_content_settings')) {
            abort(503, 'Site content storage is not available. Run database migrations.');
        }

        $overrides = $this->computeOverrides($content);
        $setting = SiteContentSetting::current();
        $before = ['overrides' => $setting->overrides ?? []];
        $setting->overrides = $overrides;
        $setting->save();
        $this->forgetResolved();

        if ($actor instanceof User) {
            AuditRecorder::record($actor, $setting, 'site_content.updated', [
                'before' => $before,
                'after' => ['overrides' => $overrides],
                'changed_keys' => array_keys(Arr::dot($overrides)),
            ], $request);
        }

        return $setting;
    }
}
