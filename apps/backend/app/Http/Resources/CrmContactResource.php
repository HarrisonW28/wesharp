<?php

namespace App\Http\Resources;

use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Contact */
class CrmContactResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var Contact $c */
        $c = $this->resource;
        $archived = $c->archived_at !== null;

        return [
            'id' => (string) $c->id,
            'first_name' => $c->first_name,
            'last_name' => $c->last_name,
            'email' => $c->email,
            'phone' => $c->phone,
            'billing_contact' => (bool) $c->billing_contact,
            'notes' => $c->notes,
            'archived_at' => $c->archived_at?->toIso8601String(),
            'is_archived' => $archived,
            'status_label' => $archived ? 'Archived' : 'Active',
        ];
    }

    public static function label(Contact $c): string
    {
        $name = trim($c->first_name.' '.$c->last_name);

        return $name !== '' ? $name : ($c->email ?? 'Contact');
    }

    public static function auditSummary(Contact $c): string
    {
        $base = self::label($c);
        $email = $c->email;

        return trim($base.($email ? ' · '.$email : ''));
    }
}
