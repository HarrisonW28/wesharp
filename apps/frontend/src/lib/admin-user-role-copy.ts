import type { UserRoleValue } from "@/lib/api/admin-users-schema";

export const USER_ROLE_LABELS: Record<UserRoleValue, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  developer: "Developer",
  route_manager: "Route manager",
  finance: "Finance",
  customer_owner: "Customer owner",
  customer_staff: "Customer staff",
};

/** Short helper copy for admin user management forms. */
export const USER_ROLE_DESCRIPTIONS: Record<UserRoleValue, string> = {
  super_admin: "Full internal access including user management and destructive safeguards.",
  admin: "Full business operations without global audit log or integration diagnostics.",
  developer: "Audit log, webhook inbox, and notification delivery tooling — not a day-to-day operator role.",
  route_manager: "Routes, bookings, and field operations — no user directory or finance overrides.",
  finance: "Orders, invoices, and payments — no user directory or route editing.",
  customer_owner: "Tenant portal — manages their company record and staff.",
  customer_staff: "Tenant portal — day-to-day bookings and account views.",
};

export const USER_STATUS_LABELS: Record<string, string> = {
  invited: "Invited",
  active: "Active",
  suspended: "Suspended",
};
