"use client";

import { StaffRouteGate } from "@/components/auth/StaffRouteGate";
import { Toaster } from "sonner";

export default function RouteManagerAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffRouteGate>
      <Toaster richColors closeButton position="top-center" />
      {children}
    </StaffRouteGate>
  );
}
