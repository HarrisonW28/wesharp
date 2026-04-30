import { BOOKING_STATUS, INVOICE_STATUS, KNIFE_CUSTODY_STATUS, ORDER_STATUS } from "@/config/statuses";

export function bookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [BOOKING_STATUS.DRAFT]: "Draft",
    [BOOKING_STATUS.REQUESTED]: "Requested",
    [BOOKING_STATUS.CONFIRMED]: "Confirmed",
    [BOOKING_STATUS.IN_PROGRESS]: "In progress",
    [BOOKING_STATUS.COMPLETED]: "Completed",
    [BOOKING_STATUS.CANCELLED]: "Cancelled",
  };
  return labels[status] ?? status;
}

export function invoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [INVOICE_STATUS.DRAFT]: "Draft",
    [INVOICE_STATUS.ISSUED]: "Issued",
    [INVOICE_STATUS.PAID]: "Paid",
    [INVOICE_STATUS.OVERDUE]: "Overdue",
    [INVOICE_STATUS.VOID]: "Void",
  };
  return labels[status] ?? status;
}

export function custodyStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [KNIFE_CUSTODY_STATUS.WITH_CUSTOMER]: "At venue",
    [KNIFE_CUSTODY_STATUS.IN_TRANSIT_TO_FACILITY]: "Collecting",
    [KNIFE_CUSTODY_STATUS.AT_FACILITY]: "At facility",
    [KNIFE_CUSTODY_STATUS.SHARPENING]: "Sharpening",
    [KNIFE_CUSTODY_STATUS.IN_TRANSIT_TO_CUSTOMER]: "Returning",
    [KNIFE_CUSTODY_STATUS.RETURNED]: "Returned",
  };
  return labels[status] ?? status;
}

export function orderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [ORDER_STATUS.PENDING]: "Pending",
    [ORDER_STATUS.PAID]: "Paid",
    [ORDER_STATUS.FULFILLED]: "Fulfilled",
    [ORDER_STATUS.CANCELLED]: "Cancelled",
  };
  return labels[status] ?? status;
}
