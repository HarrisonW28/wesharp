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
use App\Models\User;
use App\Support\Crm\CompanyCrmOverview;
use App\Support\Crm\CompanySubscriptionCrmPayload;
use App\Support\Orders\OrderStatusPresentation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

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

        $viewer = $request->user();
        \assert($viewer instanceof User);

        return [
            'id' => (string) $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'company_status' => $c->company_status?->value,
            'phone' => $c->phone,
            'billing_email' => $c->billing_email,
            'city' => $c->city,
            'overview' => CompanyCrmOverview::toArray($c),
            'subscription' => CompanySubscriptionCrmPayload::build($c, $viewer),
            'users' => $c->relationLoaded('users')
                ? $c->users->map(static fn (User $u) => self::userRow($u))->values()->all()
                : $c->users()->orderBy('name')->limit(100)->get()->map(static fn (User $u) => self::userRow($u))->values()->all(),
            'contacts' => $c->contacts->map(
                static fn (Contact $contact) => (new CrmContactResource($contact))->resolve()
            )->values()->all(),
            'locations' => $c->locations->map(
                static fn (CompanyLocation $loc) => (new CrmLocationResource($loc))->resolve()
            )->values()->all(),
            'notes' => $c->notes->map(static fn (Note $n) => [
                'id' => (string) $n->id,
                'body' => $n->body,
                'created_at' => $n->created_at?->toIso8601String(),
                'author_name' => $n->relationLoaded('author') && $n->author ? $n->author->name : null,
                'author_id' => $n->author_id ? (string) $n->author_id : null,
            ]),
            'bookings' => $c->bookings->map(static function (Booking $b) {
                $loc = $b->relationLoaded('location') ? $b->location : null;
                $contact = $b->relationLoaded('contact') ? $b->contact : null;

                return [
                    'id' => (string) $b->id,
                    'booking_status' => $b->booking_status?->value,
                    'booking_status_label' => $b->booking_status !== null
                        ? Str::headline(str_replace('_', ' ', $b->booking_status->value))
                        : null,
                    'service_type' => $b->service_type?->value,
                    'service_type_label' => $b->service_type !== null
                        ? Str::headline(str_replace('_', ' ', $b->service_type->value))
                        : null,
                    'scheduled_date' => $b->scheduled_date?->format('Y-m-d'),
                    'internal_notes' => $b->internal_notes,
                    'company_location_id' => $b->company_location_id ? (string) $b->company_location_id : null,
                    'site_summary' => $loc !== null ? CrmLocationResource::summaryLine($loc) : null,
                    'site_label' => $loc?->label,
                    'contact_id' => $b->contact_id ? (string) $b->contact_id : null,
                    'contact_display' => $contact !== null ? CrmContactResource::label($contact) : null,
                ];
            }),
            'orders' => $c->orders->map(static fn (Order $o) => [
                'id' => (string) $o->id,
                'order_status' => $o->order_status?->value,
                'order_status_label' => $o->order_status !== null
                    ? OrderStatusPresentation::adminLabel($o->order_status)
                    : null,
                'total_pence' => (int) $o->total_pence,
                'currency' => $o->currency,
            ]),
            'knives' => $c->knives->map(static fn (Knife $k) => [
                'id' => (string) $k->id,
                'label' => $k->label,
                'knife_status' => $k->knife_status?->value,
                'knife_status_label' => $k->knife_status !== null
                    ? Str::headline(str_replace('_', ' ', $k->knife_status->value))
                    : null,
                'position' => $k->position,
            ]),
            'invoices' => $c->invoices->map(static fn (Invoice $inv) => [
                'id' => (string) $inv->id,
                'invoice_number' => $inv->invoice_number,
                'invoice_status' => $inv->invoice_status?->value,
                'invoice_status_label' => $inv->invoice_status !== null
                    ? Str::headline(str_replace('_', ' ', $inv->invoice_status->value))
                    : null,
                'total_pence' => (int) $inv->total_pence,
                'currency' => $inv->currency,
                'issued_on' => $inv->issued_on?->format('Y-m-d'),
            ]),
            'created_at' => $c->created_at?->toIso8601String(),
            'updated_at' => $c->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private static function userRow(User $u): array
    {
        $role = $u->resolvedRole();

        return [
            'id' => (string) $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $role->value,
            'role_label' => Str::headline(str_replace('_', ' ', $role->value)),
            'status' => $u->status?->value,
            'status_label' => $u->status !== null
                ? Str::headline(str_replace('_', ' ', $u->status->value))
                : null,
        ];
    }
}
