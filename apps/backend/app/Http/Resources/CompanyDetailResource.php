<?php

namespace App\Http\Resources;

use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Contact;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\Note;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Company profile detail with embedded collections for bookings, invoices, orders, knives, notes.
 */
class CompanyDetailResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var Company $c */
        $c = $this->resource;

        return [
            'id' => (string) $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'company_status' => $c->company_status?->value,
            'phone' => $c->phone,
            'billing_email' => $c->billing_email,
            'city' => $c->city,
            'contacts' => $c->contacts->map(static fn (Contact $contact) => [
                'id' => (string) $contact->id,
                'first_name' => $contact->first_name,
                'last_name' => $contact->last_name,
                'email' => $contact->email,
                'phone' => $contact->phone,
                'billing_contact' => (bool) $contact->billing_contact,
            ]),
            'locations' => $c->locations->map(static fn (CompanyLocation $loc) => [
                'id' => (string) $loc->id,
                'label' => $loc->label,
                'line_one' => $loc->line_one,
                'line_two' => $loc->line_two,
                'city' => $loc->city,
                'postcode' => $loc->postcode,
                'country' => $loc->country,
                'latitude' => $loc->latitude,
                'longitude' => $loc->longitude,
            ]),
            'notes' => $c->notes->map(static fn (Note $n) => [
                'id' => (string) $n->id,
                'body' => $n->body,
                'created_at' => $n->created_at?->toIso8601String(),
                'author_name' => $n->relationLoaded('author') && $n->author ? $n->author->name : null,
                'author_id' => $n->author_id ? (string) $n->author_id : null,
            ]),
            'bookings' => $c->bookings->map(static fn (Booking $b) => [
                'id' => (string) $b->id,
                'booking_status' => $b->booking_status?->value,
                'service_type' => $b->service_type?->value,
                'scheduled_date' => $b->scheduled_date?->format('Y-m-d'),
                'internal_notes' => $b->internal_notes,
                'company_location_id' => $b->company_location_id ? (string) $b->company_location_id : null,
            ]),
            'orders' => $c->orders->map(static fn (Order $o) => [
                'id' => (string) $o->id,
                'order_status' => $o->order_status?->value,
                'total_pence' => (int) $o->total_pence,
                'currency' => $o->currency,
            ]),
            'knives' => $c->knives->map(static fn (Knife $k) => [
                'id' => (string) $k->id,
                'label' => $k->label,
                'knife_status' => $k->knife_status?->value,
                'position' => $k->position,
            ]),
            'invoices' => $c->invoices->map(static fn (Invoice $inv) => [
                'id' => (string) $inv->id,
                'invoice_number' => $inv->invoice_number,
                'invoice_status' => $inv->invoice_status?->value,
                'total_pence' => (int) $inv->total_pence,
                'currency' => $inv->currency,
                'issued_on' => $inv->issued_on?->format('Y-m-d'),
            ]),
            'created_at' => $c->created_at?->toIso8601String(),
            'updated_at' => $c->updated_at?->toIso8601String(),
        ];
    }
}
