"use client";

import { useMemo, useState, type ReactNode } from "react";

import { ADMIN_NAV, ROUTE_MANAGER_NAV, type NavItem } from "@/config/navigation";

import { Toaster } from "sonner";

import { StaffRouteGate } from "@/components/auth/StaffRouteGate";
import { ShellPermissionBoundary } from "@/components/auth/ShellPermissionBoundary";
import { UserMenu } from "@/components/auth/UserMenu";
import { MobileDrawer } from "@/components/navigation/MobileDrawer";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { TopBar } from "@/components/navigation/TopBar";

import { useBackendMe } from "@/hooks/use-backend-me";

function filterNav(items: NavItem[], permissions: Set<string>): NavItem[] {
  return items.filter((item) => !item.permission || permissions.has(item.permission));
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data } = useBackendMe();

  const permissions = useMemo(() => new Set(data?.data?.permissions ?? []), [data?.data?.permissions]);

  const role = data?.data?.user.role;
  const navItems =
    role === "route_manager" ? filterNav(ROUTE_MANAGER_NAV, permissions) : filterNav(ADMIN_NAV, permissions);

  return (
    <StaffRouteGate>
      <Toaster richColors closeButton position="top-right" />
      <ShellPermissionBoundary scope="admin" label="Checking operations permissions…">
        <div className="flex min-h-screen bg-gradient-to-br from-muted/35 via-background to-muted/20">
          <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-background/95 md:backdrop-blur">
            <div className="flex h-14 items-center border-b px-4">
              <div className="text-sm font-semibold tracking-tight">WeSharp Ops</div>
            </div>
            <SidebarNav items={navItems} />
            <div className="mt-auto border-t p-4 text-xs text-muted-foreground">
              Manchester · Liverpool coverage · Internal console
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar
              title="WeSharp"
              showMenu
              subtitle="Operations console"
              onMenuClick={() => setDrawerOpen(true)}
              trailing={<UserMenu variant="internal" />}
            />
            <main className="flex-1 space-y-8 px-4 py-6 md:px-8">{children}</main>
          </div>

          <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} items={navItems} />
        </div>
      </ShellPermissionBoundary>
    </StaffRouteGate>
  );
}
