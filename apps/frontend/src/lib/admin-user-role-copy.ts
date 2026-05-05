import type { UserRoleValue } from "@/lib/api/admin-users-schema";

export const USER_ROLE_LABELS: Record<UserRoleValue, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  developer: "Developer",
  route_manager: "Route manager",
  driver: "Driver",
  sales: "Sales",
  finance: "Finance",
  customer_owner: "Customer owner",
  customer_staff: "Customer staff",
};

/** Short helper copy for admin user management forms. */
export const USER_ROLE_DESCRIPTIONS: Record<UserRoleValue, string> = {
  super_admin: "Full internal access including user management and destructive safeguards.",
  admin: "Full business operations without global audit log or integration diagnostics.",
  developer:
    "System tooling — audit log, webhooks, notification deliveries, site content admin (including reset to defaults), and company or draft-booking hard-delete for clearing test data.",
  route_manager: "Routes, bookings, and field operations — no user directory or finance overrides.",
  driver: "Assigned runs and stops only — status, evidence, and knives — no planning, CRM create, or finance.",
  sales: "Customers, bookings, and orders — pricing and coverage read-only — no routes or finance.",
  finance: "Orders, invoices, and payments — no user directory or route editing.",
  customer_owner: "Tenant portal — manages their company record and staff.",
  customer_staff: "Tenant portal — day-to-day bookings and account views.",
};

export const USER_STATUS_LABELS: Record<string, string> = {
  invited: "Invited",
  active: "Active",
  suspended: "Suspended",
};
