<?php

namespace App\Http\Resources;

use App\Enums\BookingStatus;
use App\Enums\InvoiceStatus;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Lightweight KPI blob for dashboards / spotlight cards above the CRM profile.
 */
class CompanySummaryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var Company $c */
        $c = $this->resource;

        $ordersTotal = (int) ($c->orders()->sum('total_pence'));

        return [
            'orders_total_pence' => $ordersTotal,
            'bookings_pipeline_count' => $c->bookings()->whereNotIn('booking_status', [
                BookingStatus::Cancelled->value,
                BookingStatus::Completed->value,
            ])->count(),
            'bookings_total_count' => $c->bookings()->count(),
            'contacts_count' => $c->contacts()->count(),
            'locations_count' => $c->locations()->count(),
            'knives_count' => $c->knives()->count(),
            'invoices_open_count' => $c->invoices()->whereIn('invoice_status', [
                InvoiceStatus::Sent->value,
                InvoiceStatus::Overdue->value,
                InvoiceStatus::Draft->value,
            ])->count(),
            'invoices_open_total_pence' => (int) ($c->invoices()->whereIn('invoice_status', [
                InvoiceStatus::Sent->value,
                InvoiceStatus::Overdue->value,
                InvoiceStatus::Draft->value,
            ])->sum('total_pence')),
        ];
    }
}
