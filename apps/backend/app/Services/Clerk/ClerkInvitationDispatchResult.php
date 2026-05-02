<?php

declare(strict_types=1);

namespace App\Services\Clerk;

final readonly class ClerkInvitationDispatchResult
{
    private function __construct(
        public bool $delivered,
        public bool $skipped,
        public ?string $invitationId,
        public ?string $errorMessage,
    ) {}

    public static function ok(?string $invitationId): self
    {
        return new self(true, false, $invitationId, null);
    }

    public static function skipped(string $reason): self
    {
        return new self(false, true, null, $reason);
    }

    public static function failed(string $message): self
    {
        return new self(false, false, null, $message);
    }
}
