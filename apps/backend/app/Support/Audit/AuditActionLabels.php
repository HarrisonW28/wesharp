<?php

declare(strict_types=1);

namespace App\Support\Audit;

use Illuminate\Support\Str;

final class AuditActionLabels
{
    /** @var array<string, string> */
    private const MAP = [
        'company.created' => 'Company created',
        'company.updated' => 'Company updated',
        'company.status_changed' => 'Company status changed',
        'company.deleted' => 'Company deleted',
        'company.note_added' => 'Note added (company)',
        'company.contact_added' => 'Contact added',
        'company.contact_updated' => 'Contact updated',
        'company.contact_archived' => 'Contact archived',
        'company.contact_restored' => 'Contact restored',
        'company.contact_primary_set' => 'Primary billing contact set',
        'company.location_added' => 'Location added',
        'company.location_updated' => 'Location updated',
        'company.location_archived' => 'Location archived',
        'company.location_restored' => 'Location restored',
        'company.location_default_set' => 'Default location set',
        'company.location_default_changed' => 'Default location changed',
        'company.booking_created' => 'Booking created (CRM)',
        'company.self_registered' => 'Company self-registered',
        'booking.created' => 'Booking created',
        'booking.created_from_public_enquiry' => 'Booking created from public enquiry',
        'booking.customer_portal_requested' => 'Booking requested (portal)',
        'booking.confirmed' => 'Booking confirmed',
        'booking.cancelled' => 'Booking cancelled',
        'booking.fields_updated' => 'Booking details updated',
        'booking.requested_window_changed' => 'Requested window changed',
        'booking.confirmed_window_changed' => 'Confirmed window changed',
        'booking.assigned_route' => 'Booking assigned to route',
        'booking.route_unassigned' => 'Booking unassigned from route',
        'booking.converted_to_order' => 'Booking converted to order',
        'booking.create_route_placeholder' => 'Route placeholder created from booking',
        'booking.hard_deleted' => 'Booking deleted',
        'order.created' => 'Order created',
        'order.created_from_booking' => 'Order created from booking',
        'order.updated' => 'Order updated',
        'order.activated' => 'Order activated',
        'order.completed' => 'Order completed',
        'order.cancelled' => 'Order cancelled',
        'order.bulk_order_items_added' => 'Bulk line items added',
        'order.bulk_price_set' => 'Bulk price set',
        'order.bulk_knives_registered' => 'Bulk knives registered',
        'invoice.updated_meta' => 'Invoice metadata updated',
        'invoice.draft_lines_updated' => 'Draft invoice lines updated',
        'invoice.marked_paid' => 'Invoice marked paid',
        'invoice.void' => 'Invoice voided',
        'invoice.payment_recorded' => 'Payment recorded on invoice',
        'invoice.send_placeholder' => 'Invoice send (placeholder)',
        'payment.recorded.manual' => 'Manual payment recorded',
        'route.created' => 'Route created',
        'route.updated' => 'Route updated',
        'route.started' => 'Route started',
        'route.completed' => 'Route completed',
        'route.stop_added' => 'Route stop added',
        'route.stops_reordered' => 'Route stops reordered',
        'route_stop.updated' => 'Route stop updated',
        'knife.registered_inventory' => 'Knife registered',
        'knife.photo_added' => 'Knife photo added',
        'knife.photo_removed' => 'Knife photo removed',
        'knife.updated' => 'Knife updated',
        'knife.created_via_order' => 'Knife created via order',
        'knife.bulk_registered' => 'Knife bulk-registered',
        'knife.attached_to_order' => 'Knife attached to order',
        'user.deactivated' => 'User deactivated',
        'user.activated' => 'User activated',
        'user.role_changed' => 'User role changed',
        'user.status_changed' => 'User status changed',
        'user.company_assignment_changed' => 'User company assignment changed',
        'user.invite_resend_placeholder' => 'Invite resent (placeholder)',
        'user.company_attached_via_portal' => 'User attached to company (portal)',
        'public.booking_enquiry' => 'Public booking enquiry',
        'note.created' => 'Note',
        'demo.audit.event' => 'Demo audit event',
    ];

    public static function label(string $action): string
    {
        return self::MAP[$action] ?? Str::headline(str_replace(['.', '_'], [' ', ' '], $action));
    }
}
