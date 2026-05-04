<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateStripeSettingsRequest;
use App\Models\StripeSetting;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Stripe\ResolvedStripeConfig;
use App\Support\Stripe\StripeKeyMask;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\App;

final class StripeSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $row = StripeSetting::current();
        $effective = App::make(ResolvedStripeConfig::class);

        return ApiResponses::success($this->integrationPayload($row, $effective));
    }

    public function update(UpdateStripeSettingsRequest $request): JsonResponse
    {
        $row = StripeSetting::current();
        /** @var array<string, mixed> $validated */
        $validated = $request->validated();

        if ($validated === []) {
            return ApiResponses::success($this->integrationPayload($row, App::make(ResolvedStripeConfig::class)));
        }

        $auditFields = [];

        if (array_key_exists('secret_key', $validated)) {
            $row->secret_key = (($validated['secret_key'] ?? '') === '') ? null : (string) $validated['secret_key'];
            $auditFields[] = 'secret_key';
        }
        if (array_key_exists('public_key', $validated)) {
            $row->public_key = (($validated['public_key'] ?? '') === '') ? null : (string) $validated['public_key'];
            $auditFields[] = 'public_key';
        }
        if (array_key_exists('webhook_secret', $validated)) {
            $row->webhook_secret = (($validated['webhook_secret'] ?? '') === '') ? null : (string) $validated['webhook_secret'];
            $auditFields[] = 'webhook_secret';
        }
        if (array_key_exists('hosted_checkout_enabled', $validated)) {
            $row->hosted_checkout_enabled = $validated['hosted_checkout_enabled'];
            $auditFields[] = 'hosted_checkout_enabled';
        }
        if (array_key_exists('allow_live', $validated)) {
            $row->allow_live = $validated['allow_live'];
            $auditFields[] = 'allow_live';
        }
        if (array_key_exists('checkout_success_url', $validated)) {
            $v = $validated['checkout_success_url'];
            $row->checkout_success_url = ($v === null || $v === '') ? null : trim((string) $v);
            $auditFields[] = 'checkout_success_url';
        }
        if (array_key_exists('checkout_cancel_url', $validated)) {
            $v = $validated['checkout_cancel_url'];
            $row->checkout_cancel_url = ($v === null || $v === '') ? null : trim((string) $v);
            $auditFields[] = 'checkout_cancel_url';
        }

        if (! $row->isDirty()) {
            return ApiResponses::success($this->integrationPayload($row, App::make(ResolvedStripeConfig::class)));
        }

        $row->save();
        $row->refresh();

        App::forgetInstance(ResolvedStripeConfig::class);

        $actor = $request->user();
        AuditRecorder::record($actor, $row, 'stripe_settings.updated', [
            'fields' => $auditFields,
        ], $request);

        $effective = App::make(ResolvedStripeConfig::class);

        return ApiResponses::success($this->integrationPayload($row, $effective));
    }

    /**
     * @return array<string, mixed>
     */
    private function integrationPayload(StripeSetting $row, ResolvedStripeConfig $effective): array
    {
        return [
            'integration' => [
                'secret_key' => [
                    'database_override' => is_string($row->secret_key) && $row->secret_key !== '',
                    'masked' => StripeKeyMask::stripeSecret($row->secret_key),
                    'effective_configured' => $effective->secretKey() !== '',
                ],
                'public_key' => [
                    'database_override' => is_string($row->public_key) && $row->public_key !== '',
                    'masked' => StripeKeyMask::publishable($row->public_key),
                    'effective_configured' => $effective->publicKey() !== '',
                ],
                'webhook_secret' => [
                    'database_override' => is_string($row->webhook_secret) && $row->webhook_secret !== '',
                    'masked' => StripeKeyMask::webhookSecret($row->webhook_secret),
                    'effective_configured' => $effective->webhookSecret() !== '',
                ],
                'hosted_checkout_enabled' => [
                    'database_value' => $row->hosted_checkout_enabled,
                    'effective' => $effective->hostedCheckoutEnabled(),
                ],
                'allow_live' => [
                    'database_value' => $row->allow_live,
                    'effective' => $effective->allowLive(),
                ],
                'checkout_success_url' => [
                    'database_value' => $row->checkout_success_url,
                    'effective' => $effective->checkoutSuccessUrl(),
                ],
                'checkout_cancel_url' => [
                    'database_value' => $row->checkout_cancel_url,
                    'effective' => $effective->checkoutCancelUrl(),
                ],
            ],
        ];
    }
}
