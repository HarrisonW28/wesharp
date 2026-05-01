import type { UserRoleValue } from "@/lib/api/admin-users-schema";

export const USER_ROLE_LABELS: Record<UserRoleValue, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  route_manager: "Route manager",
  finance: "Finance",
  customer_owner: "Customer owner",
  customer_staff: "Customer staff",
};

/** Short helper copy for admin user management forms. */
export const USER_ROLE_DESCRIPTIONS: Record<UserRoleValue, string> = {
  super_admin: "Full internal access including user management and destructive safeguards.",
  admin: "Full operations access; treat like super admin for day-to-day management.",
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
