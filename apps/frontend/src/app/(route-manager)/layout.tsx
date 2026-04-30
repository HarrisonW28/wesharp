"use client";

import { ShellPermissionBoundary } from "@/components/auth/ShellPermissionBoundary";
import { StaffRouteGate } from "@/components/auth/StaffRouteGate";
import { Toaster } from "sonner";

export default function RouteManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffRouteGate>
      <Toaster richColors closeButton position="top-center" />
      <ShellPermissionBoundary scope="admin" label="Checking route access…">
        {children}
      </ShellPermissionBoundary>
    </StaffRouteGate>
  );
}
