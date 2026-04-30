import { ShellPermissionBoundary } from "@/components/auth/ShellPermissionBoundary";
import { StaffRouteGate } from "@/components/auth/StaffRouteGate";
import { adminPermissionForPath } from "@/lib/route-permissions";

export default function RouteManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffRouteGate>
      <ShellPermissionBoundary resolver={adminPermissionForPath} label="Checking route access…">
        {children}
      </ShellPermissionBoundary>
    </StaffRouteGate>
  );
}
