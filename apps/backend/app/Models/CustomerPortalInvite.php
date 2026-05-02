<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CustomerPortalInviteStatus;
use Database\Factories\CustomerPortalInviteFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerPortalInvite extends Model
{
    /** @use HasFactory<CustomerPortalInviteFactory> */
    use HasFactory;

    use HasUuids;

    protected $fillable = [
        'company_id',
        'email',
        'status',
        'token_hash',
        'invited_by_user_id',
        'expires_at',
        'last_sent_at',
        'accepted_at',
        'clerk_invitation_id',
        'last_clerk_error',
    ];

    protected function casts(): array
    {
        return [
            'status' => CustomerPortalInviteStatus::class,
            'expires_at' => 'datetime',
            'last_sent_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Company, $this> */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /** @return BelongsTo<User, $this> */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function isEffectivelyExpired(): bool
    {
        if ($this->status !== CustomerPortalInviteStatus::Pending) {
            return false;
        }

        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /** API-safe coarse status (pending rows past {@see $expires_at} surface as `expired`). */
    public function displayStatus(): string
    {
        if ($this->status === CustomerPortalInviteStatus::Accepted) {
            return 'accepted';
        }
        if ($this->status === CustomerPortalInviteStatus::Revoked) {
            return 'revoked';
        }
        if ($this->isEffectivelyExpired()) {
            return 'expired';
        }

        return 'pending';
    }
}
