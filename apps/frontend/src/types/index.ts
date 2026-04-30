import type { RoleCode } from "@/config/roles";

/** Demo session shape until Clerk wires through */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: RoleCode;
};
