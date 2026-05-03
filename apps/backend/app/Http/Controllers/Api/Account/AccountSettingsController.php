<?php

namespace App\Http\Controllers\Api\Account;

use App\Http\Requests\Account\AccountUpdateSettingsRequest;
use App\Models\Contact;
use App\Models\User;
use App\Support\Account\CustomerSubscriptionPayload;
use App\Support\ApiResponses;
use App\Support\Notifications\NotificationPreferenceNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountSettingsController extends TenantAccountController
{
    public function show(Request $request): JsonResponse
    {
        $company = $this->tenantCompany($request);

        /** @phpstan-ignore-next-line */
        $this->authorize('view', $company);

        /** @phpstan-ignore-next-line */
        $actor = $request->user();

        /** @phpstan-ignore-next-line */
        $primary = Contact::query()
            ->where('company_id', $company->id)
            ->orderByDesc('billing_contact')
            ->orderBy('created_at')
            ->first();

        return ApiResponses::success([
            'user' => [
                'id' => (string) $actor->id,
                'name' => $actor->name,
                'email' => $actor->email,
                'email_notification_preferences' => NotificationPreferenceNormalizer::normalize($actor->email_notification_preferences),
                'terms_accepted_at' => $actor->terms_accepted_at?->toIso8601String(),
                'marketing_opt_in' => (bool) ($actor->marketing_opt_in ?? false),
                'marketing_opt_in_at' => $actor->marketing_opt_in_at?->toIso8601String(),
                'marketing_opt_in_source' => $actor->marketing_opt_in_source,
            ],
            'company' => [
                'id' => (string) $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'city' => $company->city,
                'phone' => $company->phone,
                'billing_email' => $company->billing_email,
                'company_status' => $company->company_status?->value,
            ],
            'primary_contact' => $primary !== null ? [
                'first_name' => $primary->first_name,
                'last_name' => $primary->last_name,
                'email' => $primary->email,
                'phone' => $primary->phone,
                'billing_contact' => (bool) $primary->billing_contact,
            ] : null,
            'subscription' => CustomerSubscriptionPayload::forCompany((string) $company->id),
        ]);
    }

    public function update(AccountUpdateSettingsRequest $request): JsonResponse
    {
        $company = $this->tenantCompany($request);

        /** @phpstan-ignore-next-line */
        $this->authorize('view', $company);

        /** @phpstan-ignore-next-line */
        $actor = $request->user();

        /** @var array<string, mixed> $validated */
        $validated = $request->validated();

        if (data_get($validated, 'user.email_notification_preferences') !== null) {
            /** @phpstan-ignore-next-line */
            $this->authorize('updateOwnBasicProfile', $actor);

            $normalized = NotificationPreferenceNormalizer::normalize(
                data_get($validated, 'user.email_notification_preferences'),
            );
            User::query()->whereKey($actor->id)->update(['email_notification_preferences' => $normalized]);
            /** @phpstan-ignore-next-line */
            $actor->refresh();
        }

        if (data_get($validated, 'user.name') !== null) {
            /** @phpstan-ignore-next-line */
            $this->authorize('updateOwnBasicProfile', $actor);
            User::query()->whereKey($actor->id)->update(['name' => (string) data_get($validated, 'user.name')]);
            /** @phpstan-ignore-next-line */
            $actor->refresh();
        }

        if (data_get($validated, 'user.accept_portal_terms') === true) {
            /** @phpstan-ignore-next-line */
            $this->authorize('updateOwnBasicProfile', $actor);
            User::query()->whereKey($actor->id)->update(['terms_accepted_at' => now()]);
            /** @phpstan-ignore-next-line */
            $actor->refresh();
        }

        if (data_get($validated, 'user.marketing_opt_in') !== null) {
            /** @phpstan-ignore-next-line */
            $this->authorize('updateOwnBasicProfile', $actor);
            $optIn = (bool) data_get($validated, 'user.marketing_opt_in');
            if ($optIn !== (bool) ($actor->marketing_opt_in ?? false)) {
                User::query()->whereKey($actor->id)->update([
                    'marketing_opt_in' => $optIn,
                    'marketing_opt_in_at' => now(),
                    'marketing_opt_in_source' => 'account_settings',
                ]);
                /** @phpstan-ignore-next-line */
                $actor->refresh();
            }
        }

        $companyPayload = data_get($validated, 'company');

        if (is_array($companyPayload) && $companyPayload !== []) {
            /** @phpstan-ignore-next-line */
            $this->authorize('updateTenantProfile', $company);

            $patch = [];
            foreach (['phone', 'billing_email', 'name', 'city'] as $field) {
                if (array_key_exists($field, $companyPayload)) {
                    $patch[$field] = $companyPayload[$field];
                }
            }

            if ($patch !== []) {
                $company->update($patch);
            }
        }

        return $this->show($request);
    }
}
