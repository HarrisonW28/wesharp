<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CustomerPortalInvite;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CustomerPortalInvite */
final class CustomerPortalInviteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'email' => $this->email,
            'status' => $this->status->value,
            'display_status' => $this->displayStatus(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'last_sent_at' => $this->last_sent_at?->toIso8601String(),
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'clerk_invitation_id' => $this->clerk_invitation_id,
            'last_clerk_error' => $this->last_clerk_error,
            'invited_by' => $this->whenLoaded('invitedBy', fn () => $this->invitedBy === null ? null : [
                'id' => (string) $this->invitedBy->id,
                'name' => $this->invitedBy->name,
            ]),
        ];
    }
}
