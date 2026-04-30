import { ROLE_PERMISSIONS } from "@/config/permissions";
import type { PermissionCode } from "@/config/permissions";
import type { RoleCode } from "@/config/roles";

/** Client-side capability hints — Laravel Policies remain authoritative */
export function hasPermission(role: RoleCode, permission: PermissionCode): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
