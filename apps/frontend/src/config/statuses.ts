/** Canonical workflow statuses — mirror Laravel string enums */
export const BOOKING_STATUS = {
  DRAFT: "draft",
  REQUESTED: "requested",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const KNIFE_CUSTODY_STATUS = {
  WITH_CUSTOMER: "with_customer",
  IN_TRANSIT_TO_FACILITY: "in_transit_to_facility",
  AT_FACILITY: "at_facility",
  SHARPENING: "sharpening",
  IN_TRANSIT_TO_CUSTOMER: "in_transit_to_customer",
  RETURNED: "returned",
} as const;

export const INVOICE_STATUS = {
  DRAFT: "draft",
  /** Laravel enum value — issued/sent to customer */
  SENT: "sent",
  /** Legacy / alternate label in some UIs */
  ISSUED: "issued",
  PAID: "paid",
  OVERDUE: "overdue",
  VOID: "void",
} as const;

export const ORDER_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
