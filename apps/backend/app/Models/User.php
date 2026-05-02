<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable([
    'name',
    'email',
    'password',
    'clerk_user_id',
    'role',
    'company_id',
    'status',
    'email_notification_preferences',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'status' => UserStatus::class,
            'email_notification_preferences' => 'array',
        ];
    }

    /**
     * Resolve a backed enum role from persisted attributes (trim / case-normalise) so minor DB drift
     * still maps to {@see UserRole}. When missing or unrecognised, default to least-privilege tenant.
     */
    public function resolvedRole(): UserRole
    {
        if ($this->role instanceof UserRole) {
            return $this->role;
        }

        $raw = $this->getAttributes()['role'] ?? null;
        if (is_string($raw) && $raw !== '') {
            $normalised = strtolower(trim($raw));

            return UserRole::tryFrom($normalised) ?? UserRole::CustomerStaff;
        }

        return UserRole::CustomerStaff;
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'actor_id');
    }

    public function authoredNotes(): HasMany
    {
        return $this->hasMany(Note::class, 'author_id');
    }

    public function drivenOperationalRoutes(): HasMany
    {
        return $this->hasMany(OperationalRoute::class, 'driver_user_id');
    }
}
