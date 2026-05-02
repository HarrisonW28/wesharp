<?php

declare(strict_types=1);

namespace App\Support\Notifications;

use App\Models\NotificationAdminSetting;
use App\Models\User;
use Illuminate\Support\Arr;

final class NotificationPreferenceGate
{
    /**
     * When true, the outbound email should not be queued/sent (delivery row recorded separately by caller).
     *
     * @param  array{
     *   company_id?: string|null,
     *   recipient_user_id?: int|null,
     *   recipient_email?: string|null,
     * }  $ctx
     */
    public function shouldSkipOutboundEmail(string $type, array $ctx): bool
    {
        $category = NotificationTypeCategories::optionalCategoryForType($type);
        if ($category === null) {
            return false;
        }

        if (! $this->adminRespectsOptOut($category)) {
            return false;
        }

        $companyId = Arr::get($ctx, 'company_id');
        if (! is_string($companyId) || $companyId === '') {
            return false;
        }

        $user = $this->resolveRecipientUser($ctx, $companyId);
        if (! $user instanceof User) {
            return false;
        }

        $prefs = NotificationPreferenceNormalizer::normalize($user->email_notification_preferences);

        return $prefs[$category] !== true;
    }

    private function adminRespectsOptOut(string $category): bool
    {
        $row = NotificationAdminSetting::query()->orderBy('id')->first();
        if ($row === null) {
            return true;
        }

        return match ($category) {
            NotificationTypeCategories::BOOKING_UPDATES => $row->respect_booking_notification_opt_out,
            NotificationTypeCategories::ORDER_UPDATES => $row->respect_order_notification_opt_out,
            NotificationTypeCategories::SUBSCRIPTION_DIGEST => $row->respect_subscription_digest_opt_out,
            default => true,
        };
    }

    /**
     * @param  array{
     *   recipient_user_id?: int|null,
     *   recipient_email?: string|null,
     * }  $ctx
     */
    private function resolveRecipientUser(array $ctx, string $companyId): ?User
    {
        $userId = Arr::get($ctx, 'recipient_user_id');
        if (is_numeric($userId)) {
            $uid = (int) $userId;
            $user = User::query()->whereKey($uid)->first();
            if ($user instanceof User && $user->company_id !== null && (string) $user->company_id === $companyId) {
                return $user;
            }
        }

        $email = Arr::get($ctx, 'recipient_email');
        if (! is_string($email) || trim($email) === '') {
            return null;
        }

        $normalised = mb_strtolower(trim($email));

        return User::query()
            ->where('company_id', $companyId)
            ->whereRaw('LOWER(email) = ?', [$normalised])
            ->orderBy('id')
            ->first();
    }
}
