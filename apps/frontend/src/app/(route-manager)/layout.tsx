"use client";

import { ShellPermissionBoundary } from "@/components/auth/ShellPermissionBoundary";
import { StaffRouteGate } from "@/components/auth/StaffRouteGate";

export default function RouteManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffRouteGate>
      <ShellPermissionBoundary scope="admin" label="Checking route access…">
        {children}
      </ShellPermissionBoundary>
    </StaffRouteGate>
  );
}
