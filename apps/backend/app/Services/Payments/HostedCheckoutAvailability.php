<?php

declare(strict_types=1);

namespace App\Services\Payments;

final readonly class HostedCheckoutAvailability
{
    public function __construct(
        public bool $available,
        public ?string $disabledReason,
        public ?string $checkoutUrl,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'hosted_checkout_available' => $this->available,
            'disabled_reason' => $this->disabledReason,
            'checkout_url' => $this->checkoutUrl,
        ];
    }
}
