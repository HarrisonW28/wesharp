<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CustomerPortalInviteStatus;
use App\Models\Company;
use App\Models\CustomerPortalInvite;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomerPortalInvite>
 */
class CustomerPortalInviteFactory extends Factory
{
    protected $model = CustomerPortalInvite::class;

    public function definition(): array
    {
        $token = bin2hex(random_bytes(8));

        return [
            'company_id' => Company::factory(),
            'email' => fake()->unique()->safeEmail(),
            'status' => CustomerPortalInviteStatus::Pending,
            'token_hash' => hash('sha256', $token),
            'invited_by_user_id' => null,
            'expires_at' => now()->addDays(14),
            'last_sent_at' => now(),
            'accepted_at' => null,
            'clerk_invitation_id' => null,
            'last_clerk_error' => null,
        ];
    }

    public function invitedBy(User $user): static
    {
        return $this->state(fn (): array => ['invited_by_user_id' => $user->id]);
    }

    public function accepted(): static
    {
        return $this->state(fn (): array => [
            'status' => CustomerPortalInviteStatus::Accepted,
            'accepted_at' => now(),
        ]);
    }
}
