<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Paginated CRM list row with aggregate columns from {@see BuildCompaniesIndexQuery}.
 */
class CompanyResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->resource->id,
            'name' => $this->resource->name,
            'slug' => $this->resource->slug,
            'company_status' => $this->resource->company_status?->value,
            'phone' => $this->resource->phone,
            'billing_email' => $this->resource->billing_email,
            'city' => $this->resource->city,
            'total_spend_pence' => (int) ($this->resource->total_spend_pence ?? 0),
            'last_booking_date' => $this->formatDateAttr($this->resource->last_booking_date ?? null),
            'contacts_count' => $this->resource->contacts_count ?? null,
            'locations_count' => $this->resource->locations_count ?? null,
            'subscription_status' => $this->resource->crm_subscription_status !== null
                ? (string) $this->resource->crm_subscription_status
                : null,
            'has_unpaid_invoices' => (bool) ((int) ($this->resource->crm_has_unpaid_invoice ?? 0)),
            'has_active_bookings' => (bool) ((int) ($this->resource->crm_has_active_booking ?? 0)),
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }

    private function formatDateAttr(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }

        if (is_string($v)) {
            return $v;
        }

        if (\is_object($v) && method_exists($v, 'format')) {
            /** @phpstan-ignore-next-line */
            return $v->format('Y-m-d');
        }

        return null;
    }
}
