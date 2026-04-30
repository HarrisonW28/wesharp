import { BOOKING_STATUS, INVOICE_STATUS, ORDER_STATUS } from "@/config/statuses";

export function humanizeUnderscored(value: string | null | undefined): string {
  const s = (value ?? "").trim();
  return s === "" ? "—" : s.replace(/_/g, " ");
}

export function bookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [BOOKING_STATUS.DRAFT]: "Draft",
    [BOOKING_STATUS.REQUESTED]: "Requested",
    [BOOKING_STATUS.CONFIRMED]: "Confirmed",
    assigned_to_route: "On route",
    collected: "Collected",
    in_sharpening: "In sharpening",
    quality_checked: "Quality checked",
    returned: "Returned",
    [BOOKING_STATUS.IN_PROGRESS]: "In progress",
    [BOOKING_STATUS.COMPLETED]: "Completed",
    [BOOKING_STATUS.CANCELLED]: "Cancelled",
    no_show: "No show",
  };
  const key = status.trim();
  return labels[key] ?? humanizeUnderscored(key);
}

export function invoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [INVOICE_STATUS.DRAFT]: "Draft",
    [INVOICE_STATUS.ISSUED]: "Issued",
    [INVOICE_STATUS.PAID]: "Paid",
    [INVOICE_STATUS.OVERDUE]: "Overdue",
    [INVOICE_STATUS.VOID]: "Void",
  };
  const key = status.trim();
  return labels[key] ?? humanizeUnderscored(key);
}

export function knifeStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    logged: "Logged",
    collected: "Collected",
    inspected: "Inspected",
    sharpened: "Sharpened",
    quality_checked: "Quality checked",
    returned: "Returned",
    issue_reported: "Issue reported",
  };
  const key = status.trim();
  return labels[key] ?? humanizeUnderscored(key);
}

export function orderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [ORDER_STATUS.DRAFT]: "Draft",
    [ORDER_STATUS.ACTIVE]: "Active",
    [ORDER_STATUS.COMPLETED]: "Completed",
    [ORDER_STATUS.CANCELLED]: "Cancelled",
  };
  const key = status.trim();
  return labels[key] ?? humanizeUnderscored(key);
}

export function routeStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  const key = status.trim();
  return labels[key] ?? humanizeUnderscored(key);
}

/** Payment gateway / PSP row statuses (Stripe-style). */
export function paymentAttemptLabel(status: string): string {
  const key = status.trim().toLowerCase();
  const labels: Record<string, string> = {
    succeeded: "Succeeded",
    paid: "Paid",
    unpaid: "Unpaid",
    part_paid: "Part paid",
    overdue: "Overdue",
    written_off: "Written off",
    processing: "Processing",
    pending: "Pending",
    failed: "Failed",
    canceled: "Cancelled",
    cancelled: "Cancelled",
    refunded: "Refunded",
    requires_action: "Action required",
  };
  return labels[key] ?? humanizeUnderscored(key);
}
