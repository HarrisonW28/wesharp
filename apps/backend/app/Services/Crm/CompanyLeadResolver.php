<?php

declare(strict_types=1);

namespace App\Services\Crm;

use App\Enums\CompanyStatus;
use App\Models\Company;
use Illuminate\Support\Str;

/** Match or create CRM companies for inbound marketing leads (shared by booking, bootstrap, waitlist, contact). */
final class CompanyLeadResolver
{
    public function findByEmail(string $email): ?Company
    {
        $emailNorm = Str::lower(trim($email));
        if ($emailNorm === '') {
            return null;
        }

        /** @phpstan-ignore-next-line */
        $existing = Company::query()
            ->whereRaw('LOWER(TRIM(billing_email)) = ?', [$emailNorm])
            ->first();

        if ($existing instanceof Company) {
            return $existing;
        }

        /** @phpstan-ignore-next-line */
        return Company::query()
            ->whereHas('contacts', static fn ($q): mixed => $q->whereRaw('LOWER(TRIM(email)) = ?', [$emailNorm]))
            ->first();
    }

    /**
     * @param  array{name: string, email: string, phone?: string|null, city?: string|null}  $attrs
     */
    public function resolveOrCreateLead(array $attrs): Company
    {
        $emailNorm = Str::lower(trim($attrs['email']));
        $existing = $this->findByEmail($emailNorm);
        if ($existing instanceof Company) {
            return $existing;
        }

        $name = trim($attrs['name']);
        /** @phpstan-ignore-next-line */
        return Company::query()->create([
            'name' => $name !== '' ? $name : 'Website lead',
            'slug' => $this->uniqueSlug($this->slugBase($name !== '' ? $name : 'lead')),
            'company_status' => CompanyStatus::Lead,
            'phone' => isset($attrs['phone']) && is_string($attrs['phone']) && trim($attrs['phone']) !== ''
                ? trim($attrs['phone'])
                : null,
            'billing_email' => $emailNorm,
            'city' => isset($attrs['city']) && is_string($attrs['city']) && trim($attrs['city']) !== ''
                ? trim($attrs['city'])
                : null,
        ]);
    }

    private function slugBase(string $name): string
    {
        return Str::slug(Str::substr($name, 0, 100).'-'.Str::lower(Str::random(6)), '-');
    }

    private function uniqueSlug(string $slug): string
    {
        /** @phpstan-ignore-next-line */
        $candidate = Str::substr($slug, 0, 248);
        $base = $candidate;
        $i = 2;
        /** @phpstan-ignore-next-line */
        while (Company::query()->where('slug', $candidate)->exists()) {
            $candidate = Str::substr($base, 0, 230).'--'.$i++;
        }

        return $candidate;
    }
}
