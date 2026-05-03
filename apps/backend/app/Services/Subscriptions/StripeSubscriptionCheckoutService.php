<?php

declare(strict_types=1);

namespace App\Services\Subscriptions;

use App\Models\Company;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Payments\HostedCheckoutAvailability;
use App\Services\Payments\StripeCheckoutSessionClient;
use App\Support\Stripe\StripeCheckoutEnvironmentGuard;
use Stripe\Exception\ApiErrorException;

/**
 * Stripe Checkout **mode=subscription** for catalogue plans (Laravel owns allowance and usage).
 */
final class StripeSubscriptionCheckoutService
{
    public function __construct(
        private readonly StripeCheckoutSessionClient $checkoutSessions,
    ) {}

    public function createCheckoutSession(Company $company, SubscriptionPlan $plan, User $user): HostedCheckoutAvailability
    {
        $env = StripeCheckoutEnvironmentGuard::blockingReason();
        if ($env !== null) {
            return new HostedCheckoutAvailability(false, $env, null);
        }

        $priceId = trim((string) ($plan->stripe_price_id ?? ''));
        if ($priceId === '') {
            return new HostedCheckoutAvailability(false, 'This plan is not linked to a Stripe Price ID yet.', null);
        }

        if (! $plan->is_active || $plan->trashed()) {
            return new HostedCheckoutAvailability(false, 'This plan is not available for online signup.', null);
        }

        if ($company->operationalSubscription()->exists()) {
            return new HostedCheckoutAvailability(false, 'Your organisation already has an active or past-due subscription.', null);
        }

        $successUrl = trim((string) config('stripe.checkout_success_url', ''));
        $cancelUrl = trim((string) config('stripe.checkout_cancel_url', ''));

        $metadata = [
            'company_id' => (string) $company->id,
            'subscription_plan_id' => (string) $plan->id,
            'wesharp_user_id' => (string) $user->id,
        ];

        $params = [
            'mode' => 'subscription',
            'client_reference_id' => (string) $company->id,
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'line_items' => [
                ['price' => $priceId, 'quantity' => 1],
            ],
            'metadata' => $metadata,
            'subscription_data' => [
                'metadata' => $metadata,
            ],
        ];

        if (is_string($company->stripe_customer_id) && $company->stripe_customer_id !== '') {
            $params['customer'] = $company->stripe_customer_id;
        } elseif (is_string($user->email) && trim($user->email) !== '') {
            $params['customer_email'] = trim($user->email);
        }

        try {
            $session = $this->checkoutSessions->createCheckoutSession($params, [
                'idempotency_key' => 'sub_checkout_'.sha1((string) $company->id.'|'.(string) $plan->id.'|'.(string) $user->id),
            ]);
        } catch (ApiErrorException $e) {
            return new HostedCheckoutAvailability(
                false,
                'Stripe could not start subscription checkout: '.$e->getMessage(),
                null,
            );
        }

        $url = $session->url ?? null;
        if (! is_string($url) || $url === '') {
            return new HostedCheckoutAvailability(false, 'Stripe returned an incomplete checkout session.', null);
        }

        return new HostedCheckoutAvailability(true, null, $url);
    }
}
