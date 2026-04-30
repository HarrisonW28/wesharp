import type { RoleCode } from "./roles";

/** Permission strings — server must enforce; UI uses for hints only */
export const PERMISSIONS = {
  CRM_READ: "crm.read",
  CRM_WRITE: "crm.write",
  BOOKINGS_READ: "bookings.read",
  BOOKINGS_WRITE: "bookings.write",
  ROUTES_EXECUTE: "routes.execute",
  INVOICES_READ: "invoices.read",
  INVOICES_WRITE: "invoices.write",
  ORG_SETTINGS: "org.settings",
  AUDIT_READ: "audit.read",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Mock role → permission mapping for UI scaffolding */
export const ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  platform_admin: Object.values(PERMISSIONS),
  platform_operator: [
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.BOOKINGS_WRITE,
    PERMISSIONS.ROUTES_EXECUTE,
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.AUDIT_READ,
  ],
  sales_user: [PERMISSIONS.CRM_READ, PERMISSIONS.CRM_WRITE],
  route_technician: [PERMISSIONS.ROUTES_EXECUTE, PERMISSIONS.BOOKINGS_READ],
  org_admin: [
    PERMISSIONS.CRM_READ,
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.BOOKINGS_WRITE,
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.INVOICES_WRITE,
    PERMISSIONS.ORG_SETTINGS,
  ],
  venue_manager: [
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.BOOKINGS_WRITE,
    PERMISSIONS.INVOICES_READ,
  ],
  venue_staff: [PERMISSIONS.BOOKINGS_READ, PERMISSIONS.BOOKINGS_WRITE],
  finance_user: [PERMISSIONS.INVOICES_READ, PERMISSIONS.INVOICES_WRITE],
  viewer: [PERMISSIONS.BOOKINGS_READ, PERMISSIONS.INVOICES_READ],
};
