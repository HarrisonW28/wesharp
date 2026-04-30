/** Role identifiers aligned with backend RBAC keys */
export const ROLES = {
  PLATFORM_ADMIN: "platform_admin",
  PLATFORM_OPERATOR: "platform_operator",
  SALES_USER: "sales_user",
  ROUTE_TECHNICIAN: "route_technician",
  ORG_ADMIN: "org_admin",
  VENUE_MANAGER: "venue_manager",
  VENUE_STAFF: "venue_staff",
  FINANCE_USER: "finance_user",
  VIEWER: "viewer",
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];
