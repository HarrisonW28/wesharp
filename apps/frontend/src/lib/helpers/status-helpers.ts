import { BOOKING_STATUS, INVOICE_STATUS, ORDER_STATUS } from "@/config/statuses";

export function humanizeUnderscored(value: string | null | undefined): string {
  const s = (value ?? "").trim();
  return s === "" ? "—" : s.replace(/_/g, " ");
}

/** Bucketed labels for customer portal (maps several internal statuses to a small friendly set). */
export function customerBookingStatusLabel(status: string): string {
  const key = status.trim().toLowerCase();
  if (key === "requested") {
    return "Requested";
  }
  if (key === "confirmed" || key === "assigned_to_route") {
    return "Confirmed";
  }
  if (key === "collected" || key === "in_sharpening" || key === "quality_checked" || key === "returned") {
    return "In progress";
  }
  if (key === "completed" || key === "converted_to_order") {
    return "Completed";
  }
  if (key === "cancelled" || key === "no_show") {
    return "Cancelled";
  }
  if (key === "draft") {
    return "Draft";
  }
  return humanizeUnderscored(key);
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
    converted_to_order: "Converted to order",
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

/** Customer portal — short, non-technical fulfilment wording. */
export function customerOrderStatusLabel(status: string | null | undefined): string {
  const key = (status ?? "").trim().toLowerCase();
  if (key === ORDER_STATUS.DRAFT) {
    return "Being prepared";
  }
  if (key === ORDER_STATUS.ACTIVE) {
    return "In progress";
  }
  if (key === ORDER_STATUS.COMPLETED) {
    return "Completed";
  }
  if (key === ORDER_STATUS.CANCELLED) {
    return "Cancelled";
  }
  return humanizeUnderscored(key);
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

export function routeStopStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    not_started: "Not started",
    travelling: "Travelling",
    arrived: "Arrived",
    collected: "Collected",
    in_sharpening: "In sharpening",
    returned: "Returned",
    completed: "Completed",
    skipped: "Skipped",
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
